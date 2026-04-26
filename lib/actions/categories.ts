'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Category, TransactionType } from '@/types'

export async function createCategory(data: {
  name: string
  applicable_types: TransactionType[]
  color: string
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('categories').insert({
    name: data.name.trim(),
    applicable_types: data.applicable_types,
    color: data.color,
    is_archived: false,
  })
  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/transactions')
  return { error: null }
}

export async function updateCategory(
  id: string,
  data: { name?: string; color?: string }
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const update: Record<string, unknown> = {}
  if (data.name != null) update.name = data.name.trim()
  if (data.color != null) update.color = data.color
  const { error } = await supabase.from('categories').update(update).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/transactions')
  return { error: null }
}

export async function archiveCategory(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('categories').update({ is_archived: true }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/transactions')
  return { error: null }
}

export async function getAllCategories(): Promise<Category[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_archived', false)
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function exportTransactionsCSV(filters?: {
  year?: number
  month?: number
}): Promise<string> {
  const supabase = createClient()

  let query = supabase
    .from('transactions')
    .select('*, account:accounts!account_id(name), category:categories(name)')
    .order('date', { ascending: false })

  if (filters?.year && filters?.month) {
    const calStart = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`
    const lastDay = new Date(filters.year, filters.month, 0).getDate()
    const calEnd = `${filters.year}-${String(filters.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    query = query.gte('date', calStart).lte('date', calEnd)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = data ?? []
  const headers = ['date', 'account', 'merchant', 'amount', 'transaction_type', 'category', 'installment_converted', 'source', 'notes']
  const csvRows = [
    headers.join(','),
    ...rows.map(tx => [
      tx.date,
      `"${(tx.account as { name: string } | null)?.name ?? ''}"`,
      `"${(tx.merchant ?? '').replace(/"/g, '""')}"`,
      tx.amount,
      tx.type,
      `"${(tx.category as { name: string } | null)?.name ?? ''}"`,
      tx.installment_converted ? 'true' : 'false',
      tx.source,
      `"${(tx.notes ?? '').replace(/"/g, '""')}"`,
    ].join(','))
  ]

  return csvRows.join('\n')
}

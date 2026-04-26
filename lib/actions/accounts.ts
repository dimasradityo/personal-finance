'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Account, AccountType } from '@/types'

export interface AccountFormData {
  name: string
  type: AccountType
  balance: number
  credit_limit?: number | null
  statement_date?: number | null
  payment_due_date?: number | null
}

export async function getAccounts(): Promise<Account[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAccountById(id: string): Promise<Account | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createAccount(formData: AccountFormData): Promise<{ data: Account | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      name: formData.name,
      type: formData.type,
      balance: formData.balance,
      credit_limit: formData.credit_limit ?? null,
      statement_date: formData.statement_date ?? null,
      payment_due_date: formData.payment_due_date ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'An account with this name already exists.' }
    }
    return { data: null, error: error.message }
  }

  revalidatePath('/accounts')
  return { data, error: null }
}

export async function updateAccount(
  id: string,
  formData: AccountFormData
): Promise<{ data: Account | null; error: string | null }> {
  const supabase = createClient()

  // Check if balance changed to insert reconciliation event
  const existing = await getAccountById(id)
  if (existing && existing.balance !== formData.balance) {
    const { error: reconError } = await supabase.from('reconciliation_events').insert({
      account_id: id,
      previous_balance: existing.balance,
      new_balance: formData.balance,
    })
    if (reconError) return { data: null, error: `Failed to log balance change: ${reconError.message}` }
  }

  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: formData.name,
      type: formData.type,
      balance: formData.balance,
      credit_limit: formData.credit_limit ?? null,
      statement_date: formData.statement_date ?? null,
      payment_due_date: formData.payment_due_date ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'An account with this name already exists.' }
    }
    return { data: null, error: error.message }
  }

  revalidatePath('/accounts')
  return { data, error: null }
}

export async function deleteAccount(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('accounts')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/accounts')
  return { error: null }
}

export async function getTransactionCountForAccount(id: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', id)

  return count ?? 0
}

export async function getUsdtRate(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr',
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const json = await res.json() as { tether?: { idr?: number } }
    return json?.tether?.idr ?? null
  } catch {
    return null
  }
}

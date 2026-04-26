'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { TransactionType, TransactionWithRelations, Category, ClassificationRule, IngestionError } from '@/types'

export interface TransactionFilters {
  year?: number
  month?: number
  allTime?: boolean
  accountIds?: string[]
  types?: TransactionType[]
  categoryIds?: string[]
}

export interface CreateTransactionData {
  account_id: string
  date: string
  merchant: string
  amount: number
  type: TransactionType
  category_id?: string | null
  destination_account_id?: string | null
  source: 'auto' | 'manual'
  raw_email?: string | null
  notes?: string | null
}

export async function getTransactions(filters: TransactionFilters): Promise<TransactionWithRelations[]> {
  const supabase = createClient()

  let query = supabase
    .from('transactions')
    .select('*, account:accounts!account_id(*), category:categories(*), destination_account:accounts!destination_account_id(*)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (!filters.allTime && filters.year != null && filters.month != null) {
    const year = filters.year
    const month = filters.month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
    query = query.gte('date', startDate).lt('date', endDate)
  }

  if (filters.accountIds && filters.accountIds.length > 0) {
    query = query.in('account_id', filters.accountIds)
  }

  if (filters.types && filters.types.length > 0) {
    query = query.in('type', filters.types)
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in('category_id', filters.categoryIds)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as TransactionWithRelations[]
}

export async function getUnclassifiedCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .in('type', ['Income', 'Expense', 'CC Spend'])
    .is('category_id', null)

  return count ?? 0
}

export async function createTransaction(data: CreateTransactionData): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()

  const { data: tx, error } = await supabase
    .from('transactions')
    .insert({
      account_id: data.account_id,
      date: data.date,
      merchant: data.merchant,
      amount: data.amount,
      type: data.type,
      category_id: data.category_id ?? null,
      destination_account_id: data.destination_account_id ?? null,
      source: data.source,
      raw_email: data.raw_email ?? null,
      notes: data.notes ?? null,
      installment_converted: false,
    })
    .select()
    .single()

  if (error) return { id: null, error: error.message }

  // Mirror row for Internal Transfer / Savings+Investment with destination
  if (
    data.destination_account_id &&
    (data.type === 'Internal Transfer' || data.type === 'Savings/Investment')
  ) {
    await supabase.from('transactions').insert({
      account_id: data.destination_account_id,
      date: data.date,
      merchant: data.merchant,
      amount: data.amount,
      type: data.type,
      category_id: data.category_id ?? null,
      destination_account_id: data.account_id,
      source: data.source,
      raw_email: data.raw_email ?? null,
      notes: data.notes ?? null,
      installment_converted: false,
    })
  }

  revalidatePath('/', 'layout')
  return { id: tx.id, error: null }
}

export async function updateTransactionTypeAndCategory(
  id: string,
  type: TransactionType,
  categoryId: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('transactions')
    .update({ type, category_id: categoryId })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function batchUpdateTransactions(
  ids: string[],
  type?: TransactionType,
  categoryId?: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const updates: { type?: TransactionType; category_id?: string | null } = {}
  if (type != null) updates.type = type
  if (categoryId !== undefined) updates.category_id = categoryId

  const { error } = await supabase
    .from('transactions')
    .update(updates)
    .in('id', ids)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_archived', false)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getIngestionErrors(): Promise<IngestionError[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ingestion_errors')
    .select('*')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function resolveIngestionError(
  errorId: string,
  transactionId: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('ingestion_errors')
    .update({ is_resolved: true, resolved_transaction_id: transactionId })
    .eq('id', errorId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function getClassificationRules(): Promise<ClassificationRule[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('classification_rules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export interface ClassificationRuleData {
  keyword: string
  transaction_type: TransactionType
  category_id?: string | null
  is_enabled?: boolean
}

export async function createClassificationRule(data: ClassificationRuleData): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('classification_rules')
    .insert({
      keyword: data.keyword,
      transaction_type: data.transaction_type,
      category_id: data.category_id ?? null,
      is_enabled: data.is_enabled ?? true,
    })

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function updateClassificationRule(
  id: string,
  data: ClassificationRuleData
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('classification_rules')
    .update({
      keyword: data.keyword,
      transaction_type: data.transaction_type,
      category_id: data.category_id ?? null,
      is_enabled: data.is_enabled,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function toggleClassificationRule(
  id: string,
  enabled: boolean
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('classification_rules')
    .update({ is_enabled: enabled })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function deleteTransactions(ids: string[]): Promise<{ error: string | null }> {
  const supabase = createClient()

  // Fetch selected transactions to find mirror rows
  const { data: txns, error: fetchError } = await supabase
    .from('transactions')
    .select('id, merchant, date, amount, account_id, destination_account_id')
    .in('id', ids)

  if (fetchError) return { error: fetchError.message }

  const allIdsToDelete = new Set(ids)

  // For each transaction with a destination account, find its mirror row
  const transferTxns = (txns ?? []).filter((tx) => tx.destination_account_id)
  if (transferTxns.length > 0) {
    for (const tx of transferTxns) {
      const { data: mirrors } = await supabase
        .from('transactions')
        .select('id')
        .eq('merchant', tx.merchant)
        .eq('date', tx.date)
        .eq('amount', tx.amount)
        .eq('account_id', tx.destination_account_id)
        .eq('destination_account_id', tx.account_id)
        .not('id', 'in', `(${ids.join(',')})`)

      mirrors?.forEach((m) => allIdsToDelete.add(m.id))
    }
  }

  const idsArray = Array.from(allIdsToDelete)

  // Null out any ingestion_errors that reference these transactions before deleting
  await supabase
    .from('ingestion_errors')
    .update({ resolved_transaction_id: null })
    .in('resolved_transaction_id', idsArray)

  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', idsArray)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function rerunClassificationRules(): Promise<{ updatedCount: number; error: string | null }> {
  const supabase = createClient()

  // Get enabled rules
  const { data: rules, error: rulesError } = await supabase
    .from('classification_rules')
    .select('*')
    .eq('is_enabled', true)

  if (rulesError) return { updatedCount: 0, error: rulesError.message }
  if (!rules || rules.length === 0) return { updatedCount: 0, error: null }

  // Get unclassified transactions
  const { data: txns, error: txError } = await supabase
    .from('transactions')
    .select('id, merchant, type')
    .or('type.is.null,and(type.in.(Income,Expense,CC Spend),category_id.is.null)')

  if (txError) return { updatedCount: 0, error: txError.message }
  if (!txns || txns.length === 0) return { updatedCount: 0, error: null }

  type PartialTransaction = { id: string; merchant: string; type: string | null }
  const transactions = (txns ?? []) as PartialTransaction[]

  let updatedCount = 0

  for (const tx of transactions) {
    const matchedRule = (rules as ClassificationRule[]).find(
      (rule) =>
        tx.merchant != null &&
        tx.merchant.toLowerCase().includes(rule.keyword.toLowerCase())
    )

    if (matchedRule) {
      await supabase
        .from('transactions')
        .update({
          type: matchedRule.transaction_type,
          category_id: matchedRule.category_id,
        })
        .eq('id', tx.id)
      updatedCount++
    }
  }

  revalidatePath('/', 'layout')
  return { updatedCount, error: null }
}

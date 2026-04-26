'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Installment, Account } from '@/types'

export interface InstallmentWithComputed {
  id: string
  name: string
  account_id: string
  account_name: string
  account_type: string
  source_transaction_id: string | null
  total_amount: number
  monthly_amount: number
  start_month: string // 'YYYY-MM'
  tenure_months: number
  months_remaining: number
  payoff_month: string // 'YYYY-MM'
  is_completed: boolean
  notes: string | null
}

function computeFields(
  inst: Installment & { account?: Account },
  now = new Date()
): InstallmentWithComputed {
  const startYear = parseInt(inst.start_month.slice(0, 4))
  const startMonthNum = parseInt(inst.start_month.slice(5, 7))

  // payoff month = start + tenure - 1 months (last payment month)
  const payoffDate = new Date(startYear, startMonthNum - 1 + inst.tenure_months - 1, 1)
  const payoff_month = `${payoffDate.getFullYear()}-${String(payoffDate.getMonth() + 1).padStart(2, '0')}`

  // months elapsed since start (from current month)
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  const elapsedMonths = Math.max(
    0,
    (nowYear - startYear) * 12 + (nowMonth - startMonthNum)
  )
  const months_remaining = Math.max(0, inst.tenure_months - elapsedMonths)

  return {
    id: inst.id,
    name: inst.name,
    account_id: inst.account_id,
    account_name: inst.account?.name ?? 'Unknown',
    account_type: inst.account?.type ?? 'Credit Card',
    source_transaction_id: inst.source_transaction_id,
    total_amount: inst.total_amount,
    monthly_amount: inst.monthly_amount,
    start_month: inst.start_month.slice(0, 7),
    tenure_months: inst.tenure_months,
    months_remaining,
    payoff_month,
    is_completed: inst.is_completed,
    notes: inst.notes,
  }
}

export async function getActiveInstallments(): Promise<InstallmentWithComputed[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('installments')
    .select('*, account:accounts(*)')
    .eq('is_completed', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(inst => computeFields(inst as Installment & { account?: Account }))
}

export async function getCompletedInstallments(): Promise<InstallmentWithComputed[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('installments')
    .select('*, account:accounts(*)')
    .eq('is_completed', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(inst => computeFields(inst as Installment & { account?: Account }))
}

export async function getInstallmentsByMonth(monthStr: string): Promise<InstallmentWithComputed[]> {
  const active = await getActiveInstallments()
  const [y, m] = monthStr.split('-').map(Number)

  return active.filter(inst => {
    const [sy, sm] = inst.start_month.split('-').map(Number)
    const startDate = new Date(sy, sm - 1, 1)

    const [py, pm] = inst.payoff_month.split('-').map(Number)
    const payoffDate = new Date(py, pm - 1, 1)

    const targetDate = new Date(y, m - 1, 1)
    return targetDate >= startDate && targetDate <= payoffDate
  })
}

export interface CreateInstallmentData {
  name: string
  account_id: string
  total_amount: number
  monthly_amount: number
  start_month: string // 'YYYY-MM'
  tenure_months: number
  notes?: string | null
  source_transaction_id?: string | null
}

export async function createInstallment(
  data: CreateInstallmentData
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()

  const startDate = data.start_month + '-01'

  const { data: inst, error } = await supabase
    .from('installments')
    .insert({
      name: data.name,
      account_id: data.account_id,
      total_amount: data.total_amount,
      monthly_amount: data.monthly_amount,
      start_month: startDate,
      tenure_months: data.tenure_months,
      notes: data.notes ?? null,
      source_transaction_id: data.source_transaction_id ?? null,
      is_completed: false,
    })
    .select()
    .single()

  if (error) return { id: null, error: error.message }
  revalidatePath('/installments')
  revalidatePath('/pl')
  return { id: inst.id, error: null }
}

export async function convertTransactionToInstallment(
  transactionId: string,
  data: CreateInstallmentData
): Promise<{ error: string | null }> {
  const supabase = createClient()

  // Insert installment first
  const { data: inst, error: instError } = await supabase
    .from('installments')
    .insert({
      name: data.name,
      account_id: data.account_id,
      total_amount: data.total_amount,
      monthly_amount: data.monthly_amount,
      start_month: data.start_month + '-01',
      tenure_months: data.tenure_months,
      notes: data.notes ?? null,
      source_transaction_id: transactionId,
      is_completed: false,
    })
    .select()
    .single()

  if (instError) return { error: instError.message }

  // Mark the source transaction as converted
  const { error: txError } = await supabase
    .from('transactions')
    .update({ installment_converted: true })
    .eq('id', transactionId)

  if (txError) {
    // Rollback: delete the installment we just created
    await supabase.from('installments').delete().eq('id', inst.id)
    return { error: txError.message }
  }

  revalidatePath('/transactions')
  revalidatePath('/installments')
  revalidatePath('/pl')
  return { error: null }
}

export async function markInstallmentPaidOff(
  id: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('installments')
    .update({ is_completed: true })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/installments')
  revalidatePath('/pl')
  return { error: null }
}

export async function updateInstallment(
  id: string,
  data: Partial<CreateInstallmentData>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const update: Record<string, unknown> = {}
  if (data.name != null) update.name = data.name
  if (data.monthly_amount != null) update.monthly_amount = data.monthly_amount
  if (data.tenure_months != null) update.tenure_months = data.tenure_months
  if (data.notes !== undefined) update.notes = data.notes

  const { error } = await supabase
    .from('installments')
    .update(update)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/installments')
  revalidatePath('/pl')
  return { error: null }
}

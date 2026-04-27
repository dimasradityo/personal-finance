'use server'

import { createClient } from '@/lib/supabase/server'
import { getBillingCycleMonth } from '@/lib/utils/dates'
import type { Account, Transaction, Installment } from '@/types'

export type RepaymentRow = {
  account_id: string
  account_name: string
  account_type: 'Credit Card' | 'Loan'
  amount: number
  has_statement_date_warning: boolean
  installment_items: { name: string; amount: number }[]
}

export type PLData = {
  month: string
  income: { category: string; amount: number }[]
  repayments: RepaymentRow[]
  loanInstallments: { account_name: string; amount: number; installment_items: { name: string; amount: number }[] }[]
  expenses: { category: string; amount: number }[]
  savings: { destination_account: string; amount: number }[]
  totals: {
    income: number
    repayments: number
    expenses: number
    savings: number
    disposable_income: number
  }
  isProjection?: boolean
}

export async function getPLData(year: number, month: number): Promise<PLData> {
  const supabase = createClient()
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  // Calendar month bounds (for loans, expenses, income, savings)
  const calStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const calEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // Fetch all needed data in parallel
  const [txResult, accountsResult, installmentsResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, account:accounts!account_id(*), category:categories(*), destination_account:accounts!destination_account_id(*)')
      .neq('type', 'Internal Transfer')
      .order('date', { ascending: false }),
    supabase
      .from('accounts')
      .select('*')
      .eq('is_active', true),
    supabase
      .from('installments')
      .select('*, account:accounts(*)')
      .eq('is_completed', false),
  ])

  const allTx: (Transaction & { account?: Account; category?: { name: string }; destination_account?: Account })[] =
    txResult.data ?? []
  const accounts: Account[] = accountsResult.data ?? []
  const installments: (Installment & { account?: Account })[] = installmentsResult.data ?? []


  // ── Income ─────────────────────────────────────────────────────
  const incomeMap = new Map<string, number>()
  for (const tx of allTx) {
    if (tx.type !== 'Income') continue
    if (tx.date < calStart || tx.date > calEnd) continue
    const cat = tx.category?.name ?? 'Uncategorized'
    incomeMap.set(cat, (incomeMap.get(cat) ?? 0) + tx.amount)
  }
  const income = Array.from(incomeMap.entries()).map(([category, amount]) => ({ category, amount }))

  // ── Expenses ───────────────────────────────────────────────────
  const expenseMap = new Map<string, number>()
  for (const tx of allTx) {
    if (tx.type !== 'Expense') continue
    if (tx.date < calStart || tx.date > calEnd) continue
    const cat = tx.category?.name ?? 'Uncategorized'
    expenseMap.set(cat, (expenseMap.get(cat) ?? 0) + tx.amount)
  }
  const expenses = Array.from(expenseMap.entries()).map(([category, amount]) => ({ category, amount }))

  // ── Savings ────────────────────────────────────────────────────
  const savingsMap = new Map<string, number>()
  for (const tx of allTx) {
    if (tx.type !== 'Savings/Investment') continue
    if (tx.date < calStart || tx.date > calEnd) continue
    const dest = tx.destination_account?.name ?? 'Unknown'
    savingsMap.set(dest, (savingsMap.get(dest) ?? 0) + tx.amount)
  }
  const savings = Array.from(savingsMap.entries()).map(([destination_account, amount]) => ({ destination_account, amount }))

  // ── Repayments ────────────────────────────────────────────────
  const repayments: RepaymentRow[] = []

  const ccAccounts = accounts.filter(a => a.type === 'Credit Card')

  // CC accounts: billing cycle attribution
  for (const acc of ccAccounts) {
    const hasStatementDate = acc.statement_date != null
    const warning = !hasStatementDate

    let ccSpendTotal = 0
    for (const tx of allTx) {
      if (tx.account_id !== acc.id) continue
      if (tx.type !== 'CC Spend') continue
      if (tx.installment_converted) continue

      let billingMonth: string
      if (hasStatementDate) {
        billingMonth = getBillingCycleMonth(new Date(tx.date), acc.statement_date!)
      } else {
        // Fallback: calendar month
        billingMonth = tx.date.slice(0, 7)
      }

      if (billingMonth === monthStr) {
        ccSpendTotal += tx.amount
      }
    }

    // Active installments for this CC account in this month
    const accInstallments = installments.filter(inst => {
      if (inst.account_id !== acc.id) return false
      // Check if this month falls within the installment period
      const startMonth = inst.start_month.slice(0, 7)
      const endYear = parseInt(inst.start_month.slice(0, 4))
      const endMonthNum = parseInt(inst.start_month.slice(5, 7)) + inst.tenure_months - 1
      const endDate = new Date(endYear, endMonthNum - 1, 1)
      const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
      return monthStr >= startMonth && monthStr <= endMonth
    })

    const installmentItems = accInstallments.map(inst => ({
      name: inst.name,
      amount: inst.monthly_amount,
    }))

    const installmentTotal = installmentItems.reduce((s, i) => s + i.amount, 0)
    const total = ccSpendTotal + installmentTotal

    repayments.push({
      account_id: acc.id,
      account_name: acc.name,
      account_type: 'Credit Card',
      amount: total,
      has_statement_date_warning: warning,
      installment_items: installmentItems,
    })
  }

  // Loan accounts: sum of Repayment transactions in calendar month
  // A "Loan" account is identified by having transactions of type 'Repayment'
  // We look at all accounts that have repayment transactions
  const repaymentTxByAccount = new Map<string, number>()
  for (const tx of allTx) {
    if (tx.type !== 'Repayment') continue
    if (tx.date < calStart || tx.date > calEnd) continue
    repaymentTxByAccount.set(tx.account_id, (repaymentTxByAccount.get(tx.account_id) ?? 0) + tx.amount)
  }

  for (const [accountId, amount] of Array.from(repaymentTxByAccount.entries())) {
    const acc = accounts.find(a => a.id === accountId)
    if (!acc) continue
    // Don't double-count CC accounts (they're handled above via CC Spend)
    if (acc.type === 'Credit Card') continue

    repayments.push({
      account_id: acc.id,
      account_name: acc.name,
      account_type: 'Loan',
      amount,
      has_statement_date_warning: false,
      installment_items: [],
    })
  }

  // ── Loan Installments ─────────────────────────────────────────────
  const loanAccounts = accounts.filter(a => a.type === 'Loan')
  const loanInstallments = loanAccounts.map(acc => {
    const accInstallments = installments.filter(inst => {
      if (inst.account_id !== acc.id) return false
      const startMonth = inst.start_month.slice(0, 7)
      const endYear = parseInt(inst.start_month.slice(0, 4))
      const endMonthNum = parseInt(inst.start_month.slice(5, 7)) + inst.tenure_months - 1
      const endDate = new Date(endYear, endMonthNum - 1, 1)
      const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
      return monthStr >= startMonth && monthStr <= endMonth
    })
    const installmentItems = accInstallments.map(inst => ({ name: inst.name, amount: inst.monthly_amount }))
    return {
      account_name: acc.name,
      amount: installmentItems.reduce((s, i) => s + i.amount, 0),
      installment_items: installmentItems,
    }
  }).filter(row => row.amount > 0)

  // ── Totals ────────────────────────────────────────────────────
  const totalIncome = income.reduce((s, r) => s + r.amount, 0)
  const totalRepayments = repayments.reduce((s, r) => s + r.amount, 0)
  const totalLoanInstallments = loanInstallments.reduce((s, r) => s + r.amount, 0)
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0)
  const totalSavings = savings.reduce((s, r) => s + r.amount, 0)

  return {
    month: monthStr,
    income,
    repayments,
    loanInstallments,
    expenses,
    savings,
    totals: {
      income: totalIncome,
      repayments: totalRepayments + totalLoanInstallments,
      expenses: totalExpenses,
      savings: totalSavings,
      disposable_income: totalIncome - totalRepayments - totalLoanInstallments - totalExpenses - totalSavings,
    },
  }
}

// Returns the last N months of actuals for projection
async function getRecentActuals(n: number): Promise<PLData[]> {
  const now = new Date()
  const results: PLData[] = []
  for (let i = n; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    results.push(await getPLData(d.getFullYear(), d.getMonth() + 1))
  }
  return results
}

export async function getPLProjection(months = 3): Promise<{ projections: PLData[]; actualMonthsUsed: number }> {
  const actuals = await getRecentActuals(3)
  const actualMonthsUsed = actuals.length

  const supabase = createClient()
  const installmentsResult = await supabase
    .from('installments')
    .select('*, account:accounts(*)')
    .eq('is_completed', false)
  const installments: (Installment & { account?: Account })[] = installmentsResult.data ?? []

  const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0

  const avgIncome = avg(actuals.map(a => a.totals.income))
  const avgExpenses = avg(actuals.map(a => a.totals.expenses))
  const avgSavings = avg(actuals.map(a => a.totals.savings))

  const projections: PLData[] = []
  const now = new Date()

  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const projYear = d.getFullYear()
    const projMonthNum = d.getMonth() + 1
    const projMonthStr = `${projYear}-${String(projMonthNum).padStart(2, '0')}`

    // Repayments: use most recent repayment amounts + active installments
    const lastActual = actuals[actuals.length - 1]
    const projRepayments: RepaymentRow[] = lastActual.repayments.map(row => {
      // Recalculate installment items for this future month
      const accInstallments = installments.filter(inst => {
        if (inst.account_id !== row.account_id) return false
        const startMonth = inst.start_month.slice(0, 7)
        const endYear = parseInt(inst.start_month.slice(0, 4))
        const endMonthNum = parseInt(inst.start_month.slice(5, 7)) + inst.tenure_months - 1
        const endDate = new Date(endYear, endMonthNum - 1, 1)
        const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
        return projMonthStr >= startMonth && projMonthStr <= endMonth
      })
      const installmentItems = accInstallments.map(inst => ({ name: inst.name, amount: inst.monthly_amount }))
      const installmentTotal = installmentItems.reduce((s, i) => s + i.amount, 0)

      // For CC: use rolling avg CC spend + current installments
      // For Loan: use most recent fixed amount
      const baseAmount = row.account_type === 'Loan' ? row.amount : Math.round(avg(
        actuals.map(a => {
          const r = a.repayments.find(r => r.account_id === row.account_id)
          return r ? r.amount - r.installment_items.reduce((s, i) => s + i.amount, 0) : 0
        })
      ))

      return {
        ...row,
        amount: baseAmount + installmentTotal,
        installment_items: installmentItems,
      }
    })

    const totalIncome = Math.round(avgIncome)
    const totalRepayments = projRepayments.reduce((s, r) => s + r.amount, 0)
    const totalExpenses = Math.round(avgExpenses)
    const totalSavings = Math.round(avgSavings)

    projections.push({
      month: projMonthStr,
      income: [{ category: 'Projected', amount: totalIncome }],
      repayments: projRepayments,
      loanInstallments: [],
      expenses: [{ category: 'Projected', amount: totalExpenses }],
      savings: [{ destination_account: 'Projected', amount: totalSavings }],
      totals: {
        income: totalIncome,
        repayments: totalRepayments,
        expenses: totalExpenses,
        savings: totalSavings,
        disposable_income: totalIncome - totalRepayments - totalExpenses - totalSavings,
      },
      isProjection: true,
    })
  }

  return { projections, actualMonthsUsed }
}

// Fetch drill-down transactions for a CC account's billing cycle
export async function getCCDrillDown(accountId: string, year: number, month: number) {
  const supabase = createClient()
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  const [accResult, txResult, installmentsResult] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', accountId).single(),
    supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('account_id', accountId)
      .eq('type', 'CC Spend')
      .order('date', { ascending: false }),
    supabase
      .from('installments')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_completed', false),
  ])

  const acc: Account = accResult.data
  const allTx: (Transaction & { category?: { name: string } })[] = txResult.data ?? []
  const installments: Installment[] = installmentsResult.data ?? []

  const hasStatementDate = acc?.statement_date != null

  // Filter transactions to this billing cycle month
  const cycleTx = allTx.filter(tx => {
    let billingMonth: string
    if (hasStatementDate) {
      billingMonth = getBillingCycleMonth(new Date(tx.date), acc.statement_date!)
    } else {
      billingMonth = tx.date.slice(0, 7)
    }
    return billingMonth === monthStr
  })

  // Active installments for this month
  const activeInstallments = installments.filter(inst => {
    const startMonth = inst.start_month.slice(0, 7)
    const endYear = parseInt(inst.start_month.slice(0, 4))
    const endMonthNum = parseInt(inst.start_month.slice(5, 7)) + inst.tenure_months - 1
    const endDate = new Date(endYear, endMonthNum - 1, 1)
    const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
    return monthStr >= startMonth && monthStr <= endMonth
  })

  // Compute billing cycle date range label
  let cycleLabel = ''
  if (hasStatementDate) {
    const sd = acc.statement_date!
    const cycleStart = new Date(year, month - 2, sd)
    const cycleEnd = new Date(year, month - 1, sd - 1)
    cycleLabel = `${cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  } else {
    cycleLabel = `${new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${new Date(year, month - 1, new Date(year, month, 0).getDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const subtotal = cycleTx.filter(t => !t.installment_converted).reduce((s, t) => s + t.amount, 0)
  const installmentTotal = activeInstallments.reduce((s, i) => s + i.monthly_amount, 0)
  const grandTotal = subtotal + installmentTotal

  return {
    account: acc,
    transactions: cycleTx,
    installments: activeInstallments,
    cycleLabel,
    subtotal,
    installmentTotal,
    grandTotal,
    hasStatementDateWarning: !hasStatementDate,
  }
}

// Fetch drill-down transactions for a Loan account in a calendar month
export async function getLoanDrillDown(accountId: string, year: number, month: number) {
  const supabase = createClient()
  const calStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const calEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const [accResult, txResult] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', accountId).single(),
    supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('account_id', accountId)
      .eq('type', 'Repayment')
      .gte('date', calStart)
      .lte('date', calEnd)
      .order('date', { ascending: false }),
  ])

  return {
    account: accResult.data as Account,
    transactions: (txResult.data ?? []) as (Transaction & { category?: { name: string } })[],
  }
}

// Fetch drill-down for Income/Expense category
export async function getCategoryDrillDown(
  categoryName: string,
  type: 'Income' | 'Expense',
  year: number,
  month: number,
) {
  const supabase = createClient()
  const calStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const calEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await supabase
    .from('transactions')
    .select('*, account:accounts!account_id(*), category:categories(*)')
    .eq('type', type)
    .gte('date', calStart)
    .lte('date', calEnd)
    .order('date', { ascending: false })

  const txs = (data ?? []).filter((t: Transaction & { category?: { name: string } }) =>
    (t.category?.name ?? 'Uncategorized') === categoryName
  )

  return { transactions: txs }
}

// Fetch drill-down for Savings destination account
export async function getSavingsDrillDown(destinationAccountName: string, year: number, month: number) {
  const supabase = createClient()
  const calStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const calEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await supabase
    .from('transactions')
    .select('*, account:accounts!account_id(*), destination_account:accounts!destination_account_id(*)')
    .eq('type', 'Savings/Investment')
    .gte('date', calStart)
    .lte('date', calEnd)
    .order('date', { ascending: false })

  const txs = (data ?? []).filter(
    (t: Transaction & { destination_account?: Account }) =>
      (t.destination_account?.name ?? 'Unknown') === destinationAccountName
  )

  return { transactions: txs }
}

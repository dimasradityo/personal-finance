/**
 * Returns the billing cycle start and end dates for a credit card
 * given the statement_date (day of month).
 *
 * The cycle runs from (last month's statement_date + 1) to this month's statement_date.
 */
export function getBillingCycle(
  statementDay: number,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()

  const end = new Date(year, month, statementDay)
  const start = new Date(year, month - 1, statementDay + 1)

  return { start, end }
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for the first day of a given month offset.
 * offset=0 → current month, offset=-1 → last month, etc.
 */
export function monthStart(offset = 0, referenceDate: Date = new Date()): string {
  const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + offset, 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for the last day of a given month offset.
 */
export function monthEnd(offset = 0, referenceDate: Date = new Date()): string {
  const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + offset + 1, 0)
  return d.toISOString().slice(0, 10)
}

/**
 * Formats a Date as "MMM YYYY" (e.g. "Apr 2026").
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Returns the P&L month (as 'YYYY-MM') that a CC Spend transaction belongs to.
// If transaction date < statementDate → belongs to that calendar month.
// If transaction date >= statementDate → belongs to next calendar month.
export function getBillingCycleMonth(transactionDate: Date, statementDate: number): string {
  const day = transactionDate.getDate()
  const year = transactionDate.getFullYear()
  const month = transactionDate.getMonth() // 0-indexed

  if (day < statementDate) {
    // Belongs to this calendar month
    return `${year}-${String(month + 1).padStart(2, '0')}`
  } else {
    // Belongs to next calendar month
    const next = new Date(year, month + 1, 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  }
}

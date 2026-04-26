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

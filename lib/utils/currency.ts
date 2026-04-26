/**
 * Formats an integer (in IDR) as Indonesian Rupiah.
 * e.g. formatIDR(15913980) → "Rp15.913.980"
 */
export function formatIDR(amount: number): string {
  return (
    'Rp' +
    Math.abs(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
}

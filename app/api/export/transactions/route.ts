import { NextRequest, NextResponse } from 'next/server'
import { exportTransactionsCSV } from '@/lib/actions/categories'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope')

  let filters: { year?: number; month?: number } | undefined
  if (scope === 'current') {
    const now = new Date()
    filters = { year: now.getFullYear(), month: now.getMonth() + 1 }
  }

  const csv = await exportTransactionsCSV(filters)
  const today = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions_${today}.csv"`,
    },
  })
}

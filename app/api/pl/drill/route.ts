import { NextRequest, NextResponse } from 'next/server'
import {
  getCCDrillDown,
  getLoanDrillDown,
  getCategoryDrillDown,
  getSavingsDrillDown,
} from '@/lib/pl/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kind = searchParams.get('kind') as string
  const year = parseInt(searchParams.get('year') ?? '0')
  const month = parseInt(searchParams.get('month') ?? '0')

  if (!year || !month) {
    return NextResponse.json({ error: 'Missing year or month' }, { status: 400 })
  }

  if (kind === 'cc') {
    const accountId = searchParams.get('accountId') ?? ''
    const data = await getCCDrillDown(accountId, year, month)
    return NextResponse.json({ kind: 'cc', ...data })
  }

  if (kind === 'loan') {
    const accountId = searchParams.get('accountId') ?? ''
    const data = await getLoanDrillDown(accountId, year, month)
    return NextResponse.json({ kind: 'loan', ...data })
  }

  if (kind === 'income' || kind === 'expense') {
    const category = searchParams.get('category') ?? ''
    const data = await getCategoryDrillDown(category, kind === 'income' ? 'Income' : 'Expense', year, month)
    return NextResponse.json({ kind, category, ...data })
  }

  if (kind === 'savings') {
    const destination = searchParams.get('destination') ?? ''
    const data = await getSavingsDrillDown(destination, year, month)
    return NextResponse.json({ kind: 'savings', destination, ...data })
  }

  return NextResponse.json({ error: 'Unknown drill kind' }, { status: 400 })
}

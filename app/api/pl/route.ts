import { NextRequest, NextResponse } from 'next/server'
import { getPLData } from '@/lib/pl/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '0')
  const month = parseInt(searchParams.get('month') ?? '0')

  if (!year || !month) {
    return NextResponse.json({ error: 'Missing year or month' }, { status: 400 })
  }

  const data = await getPLData(year, month)
  return NextResponse.json(data)
}

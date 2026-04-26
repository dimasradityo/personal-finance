import { NextResponse } from 'next/server'
import { getPLProjection } from '@/lib/pl/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getPLProjection(3)
  return NextResponse.json(data)
}

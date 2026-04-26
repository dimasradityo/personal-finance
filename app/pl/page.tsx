import { PLDashboard } from '@/components/pl/PLDashboard'
import { getPLData } from '@/lib/pl/queries'

export const dynamic = 'force-dynamic'

export default async function PLPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const data = await getPLData(year, month)

  return (
    <div className="p-6">
      <PLDashboard initialData={data} initialYear={year} initialMonth={month} />
    </div>
  )
}

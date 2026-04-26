import { SettingsClient } from '@/components/settings/SettingsClient'
import { getAllCategories } from '@/lib/actions/categories'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const categories = await getAllCategories()

  return (
    <div className="p-6">
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 28 }}>Settings</h1>
      <SettingsClient initialCategories={categories} />
    </div>
  )
}

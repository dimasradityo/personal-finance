import { getAccounts, getUsdtRate } from '@/lib/actions/accounts'
import { AccountsPageClient } from '@/components/accounts/AccountsPageClient'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const [accounts, usdtRate] = await Promise.all([
    getAccounts(),
    getUsdtRate(),
  ])

  return <AccountsPageClient accounts={accounts} usdtRate={usdtRate} />
}

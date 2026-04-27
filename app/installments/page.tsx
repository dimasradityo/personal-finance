import { InstallmentsCalendar } from '@/components/installments/InstallmentsCalendar'
import { getActiveInstallments, getCompletedInstallments } from '@/lib/installments/queries'
import { getAccounts } from '@/lib/actions/accounts'

export const dynamic = 'force-dynamic'

export default async function InstallmentsPage() {
  const [active, completed, accounts] = await Promise.all([
    getActiveInstallments(),
    getCompletedInstallments(),
    getAccounts(),
  ])

  const ccAccounts = accounts.filter(a => a.type === 'Credit Card')
  const loanAccounts = accounts.filter(a => a.type === 'Loan')

  return (
    <div className="p-6 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <InstallmentsCalendar
        initialActive={active}
        initialCompleted={completed}
        ccAccounts={ccAccounts}
        loanAccounts={loanAccounts}
      />
    </div>
  )
}

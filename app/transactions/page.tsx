import {
  getTransactions,
  getUnclassifiedCount,
  getCategories,
  getIngestionErrors,
  getClassificationRules,
} from '@/lib/actions/transactions'
import { getAccounts } from '@/lib/actions/accounts'
import { TransactionsFeed } from '@/components/transactions/TransactionsFeed'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [
    initialTransactions,
    initialUnclassifiedCount,
    accounts,
    categories,
    rules,
    ingestionErrors,
  ] = await Promise.all([
    getTransactions({ year: currentYear, month: currentMonth, allTime: false }),
    getUnclassifiedCount(),
    getAccounts(),
    getCategories(),
    getClassificationRules(),
    getIngestionErrors(),
  ])

  return (
    <TransactionsFeed
      initialTransactions={initialTransactions}
      initialUnclassifiedCount={initialUnclassifiedCount}
      accounts={accounts}
      categories={categories}
      rules={rules}
      ingestionErrors={ingestionErrors}
      currentYear={currentYear}
      currentMonth={currentMonth}
    />
  )
}

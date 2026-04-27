import { AccountType, TransactionType } from '@/types'

export interface BalanceDelta {
  accountId: string
  delta: number
}

export interface TransactionFields {
  account_id: string
  account_type: AccountType
  destination_account_id: string | null
  destination_account_type: AccountType | null
  amount: number
  type: TransactionType
}

export function getBalanceDelta(tx: TransactionFields): BalanceDelta[] {
  const deltas: BalanceDelta[] = []

  const srcExcluded = tx.account_type === 'Crypto Wallet'
  const dstExcluded = tx.destination_account_type === 'Crypto Wallet'

  switch (tx.type) {
    case 'Income':
      if (!srcExcluded) deltas.push({ accountId: tx.account_id, delta: tx.amount })
      break
    case 'Expense':
      if (!srcExcluded) deltas.push({ accountId: tx.account_id, delta: -tx.amount })
      break
    case 'CC Spend':
      if (!srcExcluded) deltas.push({ accountId: tx.account_id, delta: tx.amount })
      break
    case 'Repayment':
      if (!srcExcluded) deltas.push({ accountId: tx.account_id, delta: -tx.amount })
      if (tx.destination_account_id && !dstExcluded) {
        deltas.push({ accountId: tx.destination_account_id, delta: -tx.amount })
      }
      break
    case 'Savings/Investment':
    case 'Internal Transfer':
      if (!srcExcluded) deltas.push({ accountId: tx.account_id, delta: -tx.amount })
      if (tx.destination_account_id && !dstExcluded) {
        deltas.push({ accountId: tx.destination_account_id, delta: tx.amount })
      }
      break
  }

  return deltas
}

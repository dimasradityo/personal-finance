// ─── Enums / Literals ─────────────────────────────────────────────────────────

export type AccountType = 'Debit' | 'Credit Card' | 'E-Wallet' | 'Crypto Wallet'

export type TransactionType =
  | 'Income'
  | 'Expense'
  | 'CC Spend'
  | 'Repayment'
  | 'Savings/Investment'
  | 'Internal Transfer'

export type TransactionSource = 'auto' | 'manual'

// ─── Database Row Types ────────────────────────────────────────────────────────

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  credit_limit: number | null
  statement_date: number | null
  payment_due_date: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  applicable_types: TransactionType[]
  color: string
  is_archived: boolean
  created_at: string
}

export interface Transaction {
  id: string
  account_id: string
  date: string
  merchant: string
  amount: number
  type: TransactionType
  category_id: string | null
  installment_converted: boolean
  destination_account_id: string | null
  source: TransactionSource
  raw_email: string | null
  notes: string | null
  created_at: string
}

export interface Installment {
  id: string
  name: string
  account_id: string
  source_transaction_id: string | null
  total_amount: number
  monthly_amount: number
  start_month: string
  tenure_months: number
  is_completed: boolean
  notes: string | null
  created_at: string
}

export interface ClassificationRule {
  id: string
  keyword: string
  transaction_type: TransactionType
  category_id: string | null
  is_enabled: boolean
  created_at: string
}

export interface IngestionError {
  id: string
  raw_email: string
  error_reason: string
  is_resolved: boolean
  resolved_transaction_id: string | null
  created_at: string
}

export interface ReconciliationEvent {
  id: string
  account_id: string
  previous_balance: number
  new_balance: number
  created_at: string
}

// ─── Joined / View Types ──────────────────────────────────────────────────────

export interface TransactionWithRelations extends Transaction {
  account?: Account
  category?: Category
  destination_account?: Account
}

export interface InstallmentWithAccount extends Installment {
  account?: Account
}

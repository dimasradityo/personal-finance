-- ─── Accounts ─────────────────────────────────────────────────────────────────
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('Debit', 'Credit Card', 'E-Wallet', 'Crypto Wallet')),
  balance INTEGER NOT NULL DEFAULT 0,
  credit_limit INTEGER,
  statement_date INTEGER CHECK (statement_date BETWEEN 1 AND 31),
  payment_due_date INTEGER CHECK (payment_due_date BETWEEN 1 AND 31),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  applicable_types TEXT[] NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  date DATE NOT NULL,
  merchant TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('Income', 'Expense', 'CC Spend', 'Repayment', 'Savings/Investment', 'Internal Transfer')),
  category_id UUID REFERENCES categories(id),
  installment_converted BOOLEAN NOT NULL DEFAULT false,
  destination_account_id UUID REFERENCES accounts(id),
  source TEXT NOT NULL CHECK (source IN ('auto', 'manual')) DEFAULT 'auto',
  raw_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Installments ─────────────────────────────────────────────────────────────
CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  source_transaction_id UUID REFERENCES transactions(id),
  total_amount INTEGER NOT NULL,
  monthly_amount INTEGER NOT NULL,
  start_month DATE NOT NULL,
  tenure_months INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Classification rules ─────────────────────────────────────────────────────
CREATE TABLE classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Income', 'Expense', 'CC Spend', 'Repayment', 'Savings/Investment', 'Internal Transfer')),
  category_id UUID REFERENCES categories(id),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Ingestion error log ──────────────────────────────────────────────────────
CREATE TABLE ingestion_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_email TEXT NOT NULL,
  error_reason TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Reconciliation events ────────────────────────────────────────────────────
CREATE TABLE reconciliation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  previous_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Updated-at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

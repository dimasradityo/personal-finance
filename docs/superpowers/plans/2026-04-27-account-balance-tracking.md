# Account Balance Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `accounts.balance` accurate in real time by applying atomic balance deltas on every transaction create and delete.

**Architecture:** A pure `getBalanceDelta` utility computes `{ accountId, delta }[]` for any transaction. `createTransaction`, `deleteTransactions`, and `POST /api/ingest` each call this utility and apply deltas via `UPDATE accounts SET balance = balance + delta`. Mirror rows for transfers are handled by applying deltas only from the original transaction, not the auto-generated mirror. Crypto Wallet accounts are excluded.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres), TypeScript, server actions

---

## File Map

| File | Change |
|---|---|
| `lib/utils/balance.ts` | Create — pure `getBalanceDelta` function |
| `lib/actions/transactions.ts` | Modify — apply deltas in `createTransaction` and `deleteTransactions` |
| `app/api/ingest/route.ts` | Modify — apply delta after successful transaction insert |

---

### Task 1: `getBalanceDelta` utility

**Files:**
- Create: `lib/utils/balance.ts`

This is a pure function — no Supabase calls, no side effects. It takes a transaction's relevant fields and returns zero, one, or two balance adjustments.

- [ ] **Step 1: Create `lib/utils/balance.ts` with the following content**

```ts
import { AccountType, TransactionType } from '@/types'

export interface BalanceDelta {
  accountId: string
  delta: number
}

interface TransactionFields {
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
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add lib/utils/balance.ts
git commit -m "Add getBalanceDelta utility for account balance tracking"
```

---

### Task 2: Apply deltas in `createTransaction`

**Files:**
- Modify: `lib/actions/transactions.ts`

`createTransaction` currently inserts a transaction then optionally inserts a mirror row for Internal Transfer / Savings/Investment. The delta must be applied **once** from the original transaction data (source -amount, destination +amount). The mirror row already represents the same money movement from the other side — applying its delta too would double-count.

The function does not have access to account types today, so we need to fetch them.

- [ ] **Step 1: Add the import for `getBalanceDelta` and `SupabaseClient` at the top of `lib/actions/transactions.ts`**

Add to existing imports:
```ts
import { getBalanceDelta } from '@/lib/utils/balance'
import { AccountType } from '@/types'
```

- [ ] **Step 2: Add a helper `applyBalanceDeltas` just above `createTransaction` in `lib/actions/transactions.ts`**

```ts
async function applyBalanceDeltas(
  supabase: ReturnType<typeof createClient>,
  deltas: { accountId: string; delta: number }[]
): Promise<string | null> {
  for (const { accountId, delta } of deltas) {
    if (delta === 0) continue
    const { error } = await supabase.rpc('increment_balance', {
      p_account_id: accountId,
      p_delta: delta,
    })
    if (error) return error.message
  }
  return null
}
```

Note: `increment_balance` is a Postgres RPC we will create in Task 4. For now write the helper — it won't be called until the full wiring is done.

- [ ] **Step 3: Update `createTransaction` to fetch account types and apply deltas**

Replace the current `createTransaction` body (lines 77–122 in `lib/actions/transactions.ts`) with:

```ts
export async function createTransaction(data: CreateTransactionData): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()

  // Fetch account types needed for delta exclusion logic
  const accountIds = [data.account_id, data.destination_account_id].filter(Boolean) as string[]
  const { data: accountRows, error: accError } = await supabase
    .from('accounts')
    .select('id, type')
    .in('id', accountIds)
  if (accError) return { id: null, error: accError.message }

  const accountTypeMap = Object.fromEntries((accountRows ?? []).map(a => [a.id, a.type as AccountType]))
  const srcType = accountTypeMap[data.account_id]
  const dstType = data.destination_account_id ? accountTypeMap[data.destination_account_id] : null

  const { data: tx, error } = await supabase
    .from('transactions')
    .insert({
      account_id: data.account_id,
      date: data.date,
      merchant: data.merchant,
      amount: data.amount,
      type: data.type,
      category_id: data.category_id ?? null,
      destination_account_id: data.destination_account_id ?? null,
      source: data.source,
      raw_email: data.raw_email ?? null,
      notes: data.notes ?? null,
      installment_converted: false,
    })
    .select()
    .single()

  if (error) return { id: null, error: error.message }

  // Mirror row for Internal Transfer / Savings+Investment with destination
  if (
    data.destination_account_id &&
    (data.type === 'Internal Transfer' || data.type === 'Savings/Investment')
  ) {
    await supabase.from('transactions').insert({
      account_id: data.destination_account_id,
      date: data.date,
      merchant: data.merchant,
      amount: data.amount,
      type: data.type,
      category_id: data.category_id ?? null,
      destination_account_id: data.account_id,
      source: data.source,
      raw_email: data.raw_email ?? null,
      notes: data.notes ?? null,
      installment_converted: false,
    })
  }

  // Apply balance deltas (once, from original transaction only — not mirror)
  const deltas = getBalanceDelta({
    account_id: data.account_id,
    account_type: srcType,
    destination_account_id: data.destination_account_id ?? null,
    destination_account_type: dstType,
    amount: data.amount,
    type: data.type,
  })
  const deltaError = await applyBalanceDeltas(supabase, deltas)
  if (deltaError) return { id: null, error: deltaError }

  revalidatePath('/', 'layout')
  return { id: tx.id, error: null }
}
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: TypeScript error about `increment_balance` RPC not existing yet — that's fine, the RPC is created in Task 4. If the only errors are about the RPC, proceed.

Actually — the `supabase.rpc()` call is dynamically typed so it won't fail at build time. Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/transactions.ts
git commit -m "Wire balance delta application into createTransaction"
```

---

### Task 3: Apply deltas in `deleteTransactions`

**Files:**
- Modify: `lib/actions/transactions.ts`

On delete, we reverse the deltas of the **originally selected** transactions only. Mirror rows (auto-added to `allIdsToDelete`) represent the same money movement — reversing their deltas too would double-count. So we compute deltas only for rows in the original `ids` array, not the auto-added mirrors.

We need account types here too, so we fetch them alongside the transaction data.

- [ ] **Step 1: Update the `deleteTransactions` select to also fetch `type` and add account type lookup**

Replace `deleteTransactions` (lines 268–315 in `lib/actions/transactions.ts`) with:

```ts
export async function deleteTransactions(ids: string[]): Promise<{ error: string | null }> {
  const supabase = createClient()

  // Fetch selected transactions (need type + account info for balance reversal)
  const { data: txns, error: fetchError } = await supabase
    .from('transactions')
    .select('id, merchant, date, amount, type, account_id, destination_account_id')
    .in('id', ids)

  if (fetchError) return { error: fetchError.message }

  const allIdsToDelete = new Set(ids)

  // For each transaction with a destination account, find its mirror row
  const transferTxns = (txns ?? []).filter((tx) => tx.destination_account_id)
  if (transferTxns.length > 0) {
    for (const tx of transferTxns) {
      const { data: mirrors } = await supabase
        .from('transactions')
        .select('id')
        .eq('merchant', tx.merchant)
        .eq('date', tx.date)
        .eq('amount', tx.amount)
        .eq('account_id', tx.destination_account_id)
        .eq('destination_account_id', tx.account_id)
        .not('id', 'in', `(${ids.join(',')})`)

      mirrors?.forEach((m) => allIdsToDelete.add(m.id))
    }
  }

  // Fetch account types for all accounts involved in original transactions
  const involvedAccountIds = Array.from(new Set(
    (txns ?? []).flatMap(tx => [tx.account_id, tx.destination_account_id].filter(Boolean) as string[])
  ))
  const { data: accountRows } = await supabase
    .from('accounts')
    .select('id, type')
    .in('id', involvedAccountIds)
  const accountTypeMap = Object.fromEntries((accountRows ?? []).map(a => [a.id, a.type as AccountType]))

  const idsArray = Array.from(allIdsToDelete)

  // Null out any ingestion_errors that reference these transactions before deleting
  await supabase
    .from('ingestion_errors')
    .update({ resolved_transaction_id: null })
    .in('resolved_transaction_id', idsArray)

  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', idsArray)

  if (error) return { error: error.message }

  // Reverse balance deltas for originally-selected transactions only (not mirror rows)
  for (const tx of txns ?? []) {
    const deltas = getBalanceDelta({
      account_id: tx.account_id,
      account_type: accountTypeMap[tx.account_id],
      destination_account_id: tx.destination_account_id ?? null,
      destination_account_type: tx.destination_account_id ? accountTypeMap[tx.destination_account_id] : null,
      amount: tx.amount,
      type: tx.type as TransactionType,
    })
    // Reverse: negate all deltas
    const reversedDeltas = deltas.map(d => ({ ...d, delta: -d.delta }))
    const deltaError = await applyBalanceDeltas(supabase, reversedDeltas)
    if (deltaError) return { error: deltaError }
  }

  revalidatePath('/', 'layout')
  return { error: null }
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/transactions.ts
git commit -m "Wire balance delta reversal into deleteTransactions"
```

---

### Task 4: Postgres `increment_balance` RPC

**Files:**
- Modify: `supabase/migrations/0001_initial_schema.sql` (append only)

The `applyBalanceDeltas` helper calls `supabase.rpc('increment_balance', { p_account_id, p_delta })`. We need this function in Postgres. It does a simple atomic increment so concurrent writes don't race.

- [ ] **Step 1: Append the RPC to `supabase/migrations/0001_initial_schema.sql`**

```sql
-- ─── increment_balance RPC ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_balance(p_account_id UUID, p_delta INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE accounts SET balance = balance + p_delta WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 2: Run this SQL in the Supabase SQL Editor (live DB)**

```sql
CREATE OR REPLACE FUNCTION increment_balance(p_account_id UUID, p_delta INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE accounts SET balance = balance + p_delta WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql;
```

Verify with:
```sql
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'increment_balance';
```
Expected: one row returned.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_initial_schema.sql
git commit -m "Add increment_balance Postgres RPC for atomic balance updates"
```

---

### Task 5: Apply delta in `POST /api/ingest`

**Files:**
- Modify: `app/api/ingest/route.ts`

The ingest route inserts a single transaction (no mirrors). After successful insert, compute and apply the delta. We already have the account id from the lookup in step 2 of the route — we just need the account type too.

- [ ] **Step 1: Update the account lookup in `app/api/ingest/route.ts` to also select `type`**

Find this block (around line 73):
```ts
const { data: account, error: accountError } = await supabase
  .from('accounts')
  .select('id')
  .eq('name', account_name)
  .eq('is_active', true)
  .single()
```

Change `select('id')` to `select('id, type')`:
```ts
const { data: account, error: accountError } = await supabase
  .from('accounts')
  .select('id, type')
  .eq('name', account_name)
  .eq('is_active', true)
  .single()
```

- [ ] **Step 2: Add import for `getBalanceDelta` at the top of `app/api/ingest/route.ts`**

Add alongside existing imports:
```ts
import { getBalanceDelta } from '@/lib/utils/balance'
import { AccountType } from '@/types'
```

- [ ] **Step 3: Apply the delta after successful insert in `app/api/ingest/route.ts`**

Find the successful insert return (around line 151):
```ts
return NextResponse.json({ id: tx.id }, { status: 201 })
```

Insert the delta application before that return:
```ts
// Apply balance delta
const deltas = getBalanceDelta({
  account_id: account.id,
  account_type: account.type as AccountType,
  destination_account_id: null,
  destination_account_type: null,
  amount,
  type: matchedType,
})
for (const { accountId, delta } of deltas) {
  if (delta === 0) continue
  await supabase.rpc('increment_balance', { p_account_id: accountId, p_delta: delta })
}

return NextResponse.json({ id: tx.id }, { status: 201 })
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/ingest/route.ts
git commit -m "Apply balance delta on transaction ingest"
```

---

### Task 6: Push

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

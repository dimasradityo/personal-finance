# Account Balance Tracking Design

## Goal

Keep `accounts.balance` accurate in real time by updating it atomically on every transaction create and delete. Manual balance overrides are already supported via `updateAccount` + reconciliation events.

## Approach

Option B: stored column updated on every write. Balance is always a single column read — O(1) regardless of transaction history. Drift is prevented by applying balance deltas in the same database operation as the transaction insert/delete.

## Balance Delta Logic

A pure function `getBalanceDelta(transaction)` in `lib/utils/balance.ts` returns an array of `{ accountId, delta }` pairs. Callers apply each pair with:

```sql
UPDATE accounts SET balance = balance + delta WHERE id = accountId
```

### Delta rules by transaction type

| Type | Source account delta | Destination account delta |
|---|---|---|
| Income | +amount | — |
| Expense | -amount | — |
| CC Spend | +amount | — |
| Repayment | -amount | — |
| Savings/Investment | -amount | +amount (if destination_account_id set) |
| Internal Transfer | -amount | +amount (if destination_account_id set) |

### Account type exclusions

- `Crypto Wallet` accounts are excluded — if source or destination is Crypto Wallet, that account's delta is skipped.
- All other types (Debit, Credit Card, E-Wallet, Loan) are tracked.

### Credit Card semantics

CC balance represents outstanding amount owed. CC Spend increases it; Repayment decreases it. This is consistent with the existing utilization bar (`balance / credit_limit`).

### Loan semantics

Loan balance represents remaining principal owed. Only `Repayment` transactions against the loan account decrease it. Installment tracking (the `installments` table) is separate and does not affect `accounts.balance`.

## Write Paths

Three code paths must apply balance deltas:

### 1. `createTransaction` — `lib/actions/transactions.ts`

After inserting the transaction row, compute deltas and apply them. For Internal Transfer / Savings/Investment that mirror a second row, the mirror row's delta is the reverse of the first (destination +amount, source -amount) — but since the mirror row duplicates the transaction, only apply deltas once from the original call (not again for the mirror row, which has swapped account/destination).

### 2. `deleteTransactions` — `lib/actions/transactions.ts`

Before deleting, fetch each transaction's type, amount, account_id, and destination_account_id. Compute deltas and reverse them (negate). For mirror rows that are auto-included in the delete set, only reverse their deltas once (deduplication already exists via `allIdsToDelete` set — apply delta only for the originally-selected IDs, not the auto-added mirror rows).

### 3. `POST /api/ingest` — `app/api/ingest/route.ts`

After successful transaction insert, compute and apply deltas. Ingest only creates single transactions (no mirrors), so delta application is straightforward.

## Manual Balance Override

Already implemented. `updateAccount` checks if balance changed and writes a `reconciliation_events` row with `previous_balance` and `new_balance`. No changes needed.

## What Is Not In Scope

- Recomputing balance for existing historical transactions (backfilled data). Balance starts from whatever is set manually at account creation or via the edit form.
- Transaction edits (no edit UI exists). If added later, it will need to reverse old delta and apply new delta.
- Crypto Wallet balance tracking.
- Loan balance decreasing via installment schedule (only Repayment transactions affect loan balance).

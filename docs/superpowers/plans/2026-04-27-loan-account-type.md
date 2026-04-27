# Loan Account Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Loan` account type that supports installments and shows as a separate subsection under Fixed Repayments in P&L.

**Architecture:** Add `Loan` to the `AccountType` union and DB constraint, expand installment eligibility to include Loan accounts, update P&L to show a dedicated Loan Installments subsection, and update all UI components that enumerate account types.

**Tech Stack:** Next.js 14, Supabase (Postgres), TypeScript, Tailwind/CSS vars

---

## File Map

| File | Change |
|------|--------|
| `types/index.ts` | Add `'Loan'` to `AccountType` |
| `supabase/migrations/0001_initial_schema.sql` | Add `Loan` to CHECK constraint |
| `components/accounts/AccountForm.tsx` | Add `Loan` to `ACCOUNT_TYPES` array |
| `components/accounts/AccountsPageClient.tsx` | Add color/badge style for `Loan` |
| `app/installments/page.tsx` | Pass loan accounts alongside CC accounts |
| `components/installments/InstallmentsCalendar.tsx` | Rename `ccAccounts` → `eligibleAccounts`, add Loan section in calendar |
| `lib/pl/queries.ts` | Add Loan installments subsection to Fixed Repayments |
| `components/pl/PLDashboard.tsx` | Render Loan installments subsection in Fixed Repayments UI |

---

### Task 1: DB constraint + TypeScript type

**Files:**
- Modify: `types/index.ts:3`
- Modify: `supabase/migrations/0001_initial_schema.sql:5`

- [ ] **Step 1: Update AccountType in types/index.ts**

```ts
// types/index.ts line 3
export type AccountType = 'Debit' | 'Credit Card' | 'E-Wallet' | 'Crypto Wallet' | 'Loan'
```

- [ ] **Step 2: Update migration file to match**

In `supabase/migrations/0001_initial_schema.sql`, find the accounts table `type` CHECK constraint and update it:

```sql
type TEXT NOT NULL CHECK (type IN ('Debit', 'Credit Card', 'E-Wallet', 'Crypto Wallet', 'Loan')),
```

- [ ] **Step 3: Run this SQL in Supabase SQL Editor (live DB change)**

```sql
ALTER TABLE accounts DROP CONSTRAINT accounts_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('Debit', 'Credit Card', 'E-Wallet', 'Crypto Wallet', 'Loan'));
```

Verify with:
```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'accounts_type_check';
```
Expected output includes `'Loan'` in the list.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts supabase/migrations/0001_initial_schema.sql
git commit -m "Add Loan to AccountType and DB constraint"
```

---

### Task 2: Account form + accounts page UI

**Files:**
- Modify: `components/accounts/AccountForm.tsx`
- Modify: `components/accounts/AccountsPageClient.tsx`

- [ ] **Step 1: Add Loan to ACCOUNT_TYPES in AccountForm.tsx**

```ts
// components/accounts/AccountForm.tsx line 13
const ACCOUNT_TYPES: AccountType[] = ['Debit', 'Credit Card', 'E-Wallet', 'Crypto Wallet', 'Loan']
```

- [ ] **Step 2: Add color and badge style for Loan in AccountsPageClient.tsx**

Find the color map (around line 18) and badge style map (around line 25) and add:

```ts
// Color map
'Loan': 'var(--red)',

// Badge style map
'Loan': { bg: 'var(--red-dim)', border: 'var(--red-border)', color: 'var(--red)' },
```

- [ ] **Step 3: Build check**

```bash
npm run build
```
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add components/accounts/AccountForm.tsx components/accounts/AccountsPageClient.tsx
git commit -m "Add Loan account type to account form and accounts page"
```

---

### Task 3: Installments — allow Loan accounts

**Files:**
- Modify: `app/installments/page.tsx`
- Modify: `components/installments/InstallmentsCalendar.tsx`

- [ ] **Step 1: Update installments page.tsx to pass loan accounts**

```ts
// app/installments/page.tsx
const ccAccounts = accounts.filter(a => a.type === 'Credit Card')
const loanAccounts = accounts.filter(a => a.type === 'Loan')
```

Pass both to `InstallmentsCalendar`:
```tsx
<InstallmentsCalendar
  initialActive={active}
  initialCompleted={completed}
  ccAccounts={ccAccounts}
  loanAccounts={loanAccounts}
/>
```

- [ ] **Step 2: Update InstallmentsCalendar props interface**

Find `InstallmentsCalendarProps` (around line 457) and add `loanAccounts`:

```ts
interface InstallmentsCalendarProps {
  initialActive: InstallmentWithRelations[]
  initialCompleted: InstallmentWithRelations[]
  ccAccounts: Account[]
  loanAccounts: Account[]
}
```

Also update `AddInstallmentModalProps` (the form's props interface, around line 257) and the form component signature to accept `eligibleAccounts: Account[]` instead of `ccAccounts: Account[]`.

- [ ] **Step 3: In InstallmentsCalendar, combine CC + Loan as eligible accounts**

In `InstallmentsCalendar` function body (around line 460), derive eligible accounts:

```ts
const eligibleAccounts = [...ccAccounts, ...loanAccounts]
```

Pass `eligibleAccounts` to `AddInstallmentModal`:
```tsx
<AddInstallmentModal
  open={addOpen}
  onClose={() => setAddOpen(false)}
  onSuccess={refresh}
  eligibleAccounts={eligibleAccounts}
/>
```

- [ ] **Step 4: Update AddInstallmentModal to use eligibleAccounts**

Replace every reference to `ccAccounts` with `eligibleAccounts` in the modal component.

- [ ] **Step 5: Add Loan installments section in InstallmentsCalendar**

After the existing active installments list (which shows all accounts), add a visual grouping. The simplest approach is to render two separate subsections within the active list — one for CC, one for Loan — with a header label between them.

Find where `activeInstallments` are rendered and split by account type:

```ts
const activeCC = activeInstallments.filter(i => i.account?.type === 'Credit Card')
const activeLoan = activeInstallments.filter(i => i.account?.type === 'Loan')
```

Render CC section first, then if `activeLoan.length > 0`, render a "Loan Installments" subheader followed by those rows.

- [ ] **Step 6: Build check**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add app/installments/page.tsx components/installments/InstallmentsCalendar.tsx
git commit -m "Allow Loan accounts in installment creation and calendar"
```

---

### Task 4: P&L — Loan installments subsection

**Files:**
- Modify: `lib/pl/queries.ts`
- Modify: `components/pl/PLDashboard.tsx`

- [ ] **Step 1: Add loanInstallments to PLData type in lib/pl/queries.ts**

Find the `PLData` type (around line 15) and add a new field:

```ts
export type PLData = {
  month: string
  income: { category: string; amount: number }[]
  repayments: RepaymentRow[]
  loanInstallments: { account_name: string; amount: number; installment_items: { name: string; amount: number }[] }[]
  expenses: { category: string; amount: number }[]
  savings: { destination_account: string; amount: number }[]
  totals: {
    income: number
    repayments: number
    expenses: number
    savings: number
    disposable_income: number
  }
  isProjection?: boolean
}
```

- [ ] **Step 2: Compute loanInstallments in getPLData**

After the repayments section (around line 155), add:

```ts
// ── Loan Installments ─────────────────────────────────────────────
const loanAccounts = accounts.filter(a => a.type === 'Loan')
const loanInstallments = loanAccounts.map(acc => {
  const accInstallments = installments.filter(inst => {
    if (inst.account_id !== acc.id) return false
    const startMonth = inst.start_month.slice(0, 7)
    const endYear = parseInt(inst.start_month.slice(0, 4))
    const endMonthNum = parseInt(inst.start_month.slice(5, 7)) + inst.tenure_months - 1
    const endDate = new Date(endYear, endMonthNum - 1, 1)
    const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
    return monthStr >= startMonth && monthStr <= endMonth
  })
  const installmentItems = accInstallments.map(inst => ({ name: inst.name, amount: inst.monthly_amount }))
  return {
    account_name: acc.name,
    amount: installmentItems.reduce((s, i) => s + i.amount, 0),
    installment_items: installmentItems,
  }
}).filter(row => row.amount > 0)
```

- [ ] **Step 3: Include loanInstallments in totals**

Update `totalRepayments` to include loan installments:

```ts
const totalLoanInstallments = loanInstallments.reduce((s, r) => s + r.amount, 0)
```

And update `disposable_income`:
```ts
disposable_income: totalIncome - totalRepayments - totalLoanInstallments - totalExpenses - totalSavings,
```

Add to the return value:
```ts
loanInstallments,
totals: {
  ...
  repayments: totalRepayments + totalLoanInstallments,
  ...
}
```

- [ ] **Step 4: Update projection to include loanInstallments**

In `getPLProjection`, add `loanInstallments: []` to each projected month's return object (projections don't model loan installments — keep it simple for now).

- [ ] **Step 5: Update PLDashboard to render Loan installments subsection**

Find where `FIXED REPAYMENTS` is rendered in `components/pl/PLDashboard.tsx`. After the last CC repayment row, add a Loan Installments subsection if `data.loanInstallments.length > 0`:

```tsx
{data.loanInstallments.length > 0 && (
  <>
    <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', borderTop: '1px solid var(--border-subtle)' }}>
      Loan Installments
    </div>
    {data.loanInstallments.map(row => (
      <div key={row.account_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 3, height: 16, borderRadius: 2, background: 'var(--red)', display: 'inline-block' }} />
          <span style={{ fontSize: 13 }}>{row.account_name}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{formatIDR(row.amount)}</span>
      </div>
    ))}
  </>
)}
```

- [ ] **Step 6: Build check**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add lib/pl/queries.ts components/pl/PLDashboard.tsx
git commit -m "Add Loan installments subsection to P&L Fixed Repayments"
```

---

### Task 5: Push

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

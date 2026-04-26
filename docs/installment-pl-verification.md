# Installment ↔ P&L Integration — Manual QA Verification

## Prerequisites
- App running locally (`npm run dev`)
- At least one Credit Card account configured
- Current month has some CC Spend transactions

---

## Step 1 — Create a test installment

1. Navigate to `/installments`
2. Click **Add Installment**
3. Fill in:
   - Name: `QA Test Installment`
   - Linked CC Account: any CC account (e.g. BCA CC)
   - Total Amount: `9000000`
   - Monthly Amount: `3000000`
   - Start Month: current month
   - Tenure: auto-calculated as `3`
4. Click **Create Installment**

**Expected:** Installment appears in the current month column of the calendar. Payoff month = current month + 2.

---

## Step 2 — Verify P&L includes the installment

1. Navigate to `/pl`
2. Select the current month
3. Look at the **Fixed Repayments** section → the CC account row you chose

**Expected:** The CC account row amount includes `Rp3.000.000` from the installment (on top of any billing cycle CC Spend).

---

## Step 3 — Verify projection includes installment for next 3 months

1. On `/pl`, click **Projection**
2. Check the Repayments row for the next 3 months

**Expected:**
- Month +1: CC account repayment includes `Rp3.000.000`
- Month +2: CC account repayment includes `Rp3.000.000`
- Month +3: CC account repayment does NOT include this installment (tenure ended)

---

## Step 4 — Convert a CC Spend transaction to installment

1. Navigate to `/transactions`
2. Find a CC Spend transaction with amount `Rp9.000.000` (or create one manually)
3. Click the **⋯** menu on that row → **Convert to Installment**
4. Fill in:
   - Purchase name: pre-filled from merchant (edit if desired)
   - Monthly installment: `3000000`
   - Verify tenure auto-calculates to `3`
   - Verify start month = billing cycle month for that transaction
5. Click **Create Installment**

**Expected:**
- Transaction row now shows "Converted to Installment" badge with reduced opacity
- A new installment appears on the `/installments` calendar

---

## Step 5 — Verify original transaction excluded from billing cycle

1. Navigate to `/pl` → current month
2. Check the Fixed Repayments row for the CC account used in step 4

**Expected:** The `Rp9.000.000` CC Spend amount is NO LONGER included in the billing cycle sum. (The `installment_converted = true` flag excludes it from aggregation.)

---

## Step 6 — Verify installment appears correctly in months 1, 2, 3

1. On `/pl`, check the CC account Repayments row for:
   - Current month: includes `Rp3.000.000` from the converted installment
   - Month +1: includes `Rp3.000.000`
   - Month +2: includes `Rp3.000.000`
2. Click the CC account row to open the drill-down panel
3. Check **Installment items** section — the new installment should appear with its name and `Rp3.000.000`

**Expected:** All three checks pass. Grand Total in drill-down = CC Spend subtotal + installment total.

---

## Step 7 — Mark installment as paid off early

1. Navigate to `/installments`
2. Click the installment from step 4 to open the detail panel
3. Click **Mark as Paid Off** → confirm

**Expected:** Installment moves to the **Archive** tab. It no longer appears in the Active calendar.

---

## Step 8 — Verify removed installment no longer appears in P&L/projection

1. Navigate to `/pl` → current month
2. Check the CC account Repayments row

**Expected:** The `Rp3.000.000` installment amount is gone from the row (since `is_completed = true` excludes it from `getActiveInstallments()`).

3. Click **Projection**
4. Check months +1 and +2 Repayments row for that CC account

**Expected:** The `Rp3.000.000` no longer appears in any future projected month.

---

## Notes

- The P&L query uses `is_completed = false` to filter installments, so marking as paid off takes effect immediately on the next page load.
- Billing cycle attribution uses `getBillingCycleMonth(transactionDate, statementDate)`: dates before `statement_date` belong to the current month; dates on or after belong to the next month.
- `installment_converted = true` transactions are excluded from the billing cycle CC Spend sum but are still visible in the transaction feed (at reduced opacity with a badge).

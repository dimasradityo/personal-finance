'use client'

import { useState, useTransition } from 'react'
import { formatIDR } from '@/lib/utils/currency'
import { getBillingCycleMonth } from '@/lib/utils/dates'
import { convertTransactionToInstallment } from '@/lib/installments/queries'
import type { TransactionWithRelations } from '@/types'

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function monthStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}
function addMonths(ms: string, n: number): string {
  const [y, m] = ms.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return monthStr(d.getFullYear(), d.getMonth() + 1)
}
function monthLabel(ms: string) {
  const [y, m] = ms.split('-').map(Number)
  return `${MONTH_NAMES_FULL[m - 1]} ${y}`
}

interface Props {
  open: boolean
  tx: TransactionWithRelations | null
  onClose: () => void
  onSuccess: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 12px',
  background: 'var(--bg-surface)', color: 'var(--text-primary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
  fontSize: 13, outline: 'none', fontFamily: 'inherit',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{label}</label>
      {children}
    </div>
  )
}

export function ConvertInstallmentModal({ open, tx, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [monthlyStr, setMonthlyStr] = useState('')
  const [tenureStr] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Compute default start month from billing cycle attribution
  const now = new Date()
  const defaultStartMonth = (() => {
    if (!tx) return monthStr(now.getFullYear(), now.getMonth() + 1)
    const statementDate = tx.account?.statement_date
    if (statementDate) {
      return getBillingCycleMonth(new Date(tx.date + 'T00:00:00'), statementDate)
    }
    return tx.date.slice(0, 7)
  })()

  const [startYear, startMonthNum] = defaultStartMonth.split('-').map(Number)
  const [startMonth, setStartMonth] = useState({ year: startYear, month: startMonthNum })

  const total = tx?.amount ?? 0
  const monthly = parseInt(monthlyStr.replace(/\D/g, '')) || 0
  const tenureInput = parseInt(tenureStr) || 0

  // Auto-calculate tenure from monthly if not entered, or vice versa
  const computedTenure = tenureInput > 0 ? tenureInput : (monthly > 0 && total > 0 ? Math.ceil(total / monthly) : 0)
  const payoffMonth = computedTenure > 0 ? addMonths(monthStr(startMonth.year, startMonth.month), computedTenure - 1) : null

  // Reset form when tx changes
  if (!open) return null

  function handleSubmit() {
    setError(null)
    if (!tx) return
    if (!name.trim()) return setError('Name is required')
    if (monthly <= 0) return setError('Monthly amount must be > 0')
    if (computedTenure <= 0) return setError('Cannot determine tenure — enter monthly amount or tenure')

    startTransition(async () => {
      const res = await convertTransactionToInstallment(tx.id, {
        name: name.trim(),
        account_id: tx.account_id,
        total_amount: total,
        monthly_amount: monthly,
        start_month: monthStr(startMonth.year, startMonth.month),
        tenure_months: computedTenure,
        source_transaction_id: tx.id,
      })
      if (res.error) {
        setError(res.error)
      } else {
        onSuccess()
        onClose()
      }
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', width: 500, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Convert to Installment</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Purchase name">
            <input
              value={name || tx?.merchant || ''}
              onChange={e => setName(e.target.value)}
              placeholder={tx?.merchant ?? 'Purchase name'}
              style={inputStyle}
            />
          </Field>

          <Field label="Linked account">
            <div style={{ padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              {tx?.account?.name ?? '—'}
            </div>
          </Field>

          <Field label="Total amount">
            <div style={{ padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)' }}>
              {formatIDR(total)}
            </div>
          </Field>

          <Field label="Start month">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => {
                const d = new Date(startMonth.year, startMonth.month - 2, 1)
                setStartMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
              }} style={{ padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>←</button>
              <span style={{ fontSize: 13, fontWeight: 500, minWidth: 130, textAlign: 'center' }}>
                {MONTH_NAMES_FULL[startMonth.month - 1]} {startMonth.year}
              </span>
              <button onClick={() => {
                const d = new Date(startMonth.year, startMonth.month, 1)
                setStartMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
              }} style={{ padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>→</button>
            </div>
          </Field>

          <Field label="Monthly installment amount (Rp)">
            <input
              value={monthlyStr}
              onChange={e => setMonthlyStr(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </Field>

          <Field label="Tenure (months — or auto-calculated)">
            <div style={{ padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)' }}>
              {computedTenure > 0 ? `${computedTenure} months` : '—'}
            </div>
          </Field>

          {/* Preview */}
          {computedTenure > 0 && payoffMonth && (
            <div style={{ padding: '10px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--accent)' }}>
              <strong>{computedTenure} monthly payments</strong> of {formatIDR(monthly)} · Paid off: {monthLabel(payoffMonth)}
            </div>
          )}

          {/* Warning */}
          <div style={{ padding: '10px 12px', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--amber)' }}>
            The original transaction ({formatIDR(total)}) will be excluded from the billing cycle P&L and replaced by the installment schedule.
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isPending} style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: isPending ? 0.7 : 1 }}>
            {isPending ? 'Creating…' : 'Create Installment'}
          </button>
        </div>
      </div>
    </div>
  )
}

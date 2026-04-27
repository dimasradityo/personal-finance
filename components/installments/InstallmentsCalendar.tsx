'use client'

import { useState, useTransition } from 'react'
import { formatIDR } from '@/lib/utils/currency'
import {
  getActiveInstallments,
  getCompletedInstallments,
  createInstallment,
  markInstallmentPaidOff,
  type InstallmentWithComputed,
} from '@/lib/installments/queries'
import type { Account } from '@/types'

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconPlus() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function IconClose() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function IconExternal() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function monthLabel(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

function isActiveInMonth(inst: InstallmentWithComputed, monthStr: string): boolean {
  return monthStr >= inst.start_month && monthStr <= inst.payoff_month
}

function isFinalPayment(inst: InstallmentWithComputed, monthStr: string): boolean {
  return inst.payoff_month === monthStr
}

function getMonthStr(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function addMonths(monthStr: string, n: number): string {
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return getMonthStr(d.getFullYear(), d.getMonth() + 1)
}

function currentMonthStr(): string {
  const now = new Date()
  return getMonthStr(now.getFullYear(), now.getMonth() + 1)
}

// Account color mapping (cycles through accent colors)
const ACCOUNT_COLORS = [
  'var(--accent)', 'var(--amber)', 'var(--purple)', 'var(--red)', 'var(--green)', 'var(--orange)',
]
function accountColor(accountName: string, allNames: string[]): string {
  const idx = allNames.indexOf(accountName)
  return ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length]
}

// ── InstallmentCard ────────────────────────────────────────────────────────────
function InstallmentCard({
  inst, color, isFinal, onClick,
}: {
  inst: InstallmentWithComputed
  color: string
  isFinal: boolean
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        padding: '9px 10px', borderRadius: 'var(--radius-md)', marginBottom: 6,
        background: hov ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: `1px solid ${hov ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        cursor: 'pointer', transition: 'all 0.1s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {inst.name}
        </span>
        {isFinal && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 'var(--radius-sm)',
            background: 'var(--green-dim)', border: '1px solid var(--green-border)', color: 'var(--green)',
            whiteSpace: 'nowrap', marginLeft: 4, flexShrink: 0,
          }}>Final</span>
        )}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5 }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 4, verticalAlign: 'middle' }} />
        {inst.account_name}
      </div>
      <div className="font-mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
        {formatIDR(inst.monthly_amount)}
      </div>
    </div>
  )
}

// ── Detail Slide-Over ─────────────────────────────────────────────────────────
function DetailSlideOver({
  inst, open, color, onClose, onPaidOff,
}: {
  inst: InstallmentWithComputed | null
  open: boolean
  color: string
  onClose: () => void
  onPaidOff: () => void
}) {
  const [confirmPaidOff, setConfirmPaidOff] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!inst || !open) return null

  const paidMonths = inst.tenure_months - inst.months_remaining
  const paidPct = inst.tenure_months > 0 ? (paidMonths / inst.tenure_months) * 100 : 0

  function handlePaidOff() {
    startTransition(async () => {
      const res = await markInstallmentPaidOff(inst!.id)
      if (res.error) {
        setError(res.error)
      } else {
        setConfirmPaidOff(false)
        onPaidOff()
        onClose()
      }
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose} />
      <div style={{
        width: 420, height: '100%', background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{inst.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 5, verticalAlign: 'middle' }} />
              {inst.account_name}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 0, padding: 4 }}>
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Detail rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {([
              ['Total amount', formatIDR(inst.total_amount)],
              ['Monthly amount', formatIDR(inst.monthly_amount)],
              ['Start month', monthLabel(inst.start_month)],
              ['Tenure', `${inst.tenure_months} months`],
              ['Months remaining', `${inst.months_remaining} months`],
              ['Projected payoff', monthLabel(inst.payoff_month)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Source transaction link */}
          {inst.source_transaction_id && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Converted from transaction</span>
              <a
                href={`/transactions?highlight=${inst.source_transaction_id}`}
                style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
              >
                View <IconExternal />
              </a>
            </div>
          )}

          {/* Progress bar */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              {paidMonths} of {inst.tenure_months} months paid
            </div>
            <div style={{ height: 8, background: 'var(--border-default)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${paidPct}%`, background: 'var(--green)', borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
          </div>

          {inst.notes && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              {inst.notes}
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius-md)' }}>{error}</div>}

          <div style={{ flex: 1 }} />

          {/* Actions */}
          {confirmPaidOff ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--amber)', padding: '10px 12px', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius-md)' }}>
                Mark as paid off? This will move the installment to the archive and remove it from future P&L calculations.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmPaidOff(false)} style={secondaryBtn}>Cancel</button>
                <button onClick={handlePaidOff} disabled={isPending} style={destructiveBtn}>
                  {isPending ? 'Saving…' : 'Confirm Paid Off'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmPaidOff(true)} style={destructiveBtn}>Mark as Paid Off</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add Installment Modal ─────────────────────────────────────────────────────
function AddInstallmentModal({
  open, onClose, onSuccess, eligibleAccounts,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  eligibleAccounts: Account[]
}) {
  const now = new Date()
  const [name, setName] = useState('')
  const [accountId, setAccountId] = useState(eligibleAccounts[0]?.id ?? '')
  const [totalAmount, setTotalAmount] = useState('')
  const [tenure, setTenure] = useState('')
  const [startMonth, setStartMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const total = parseInt(totalAmount.replace(/\D/g, '')) || 0
  const tenureNum = parseInt(tenure) || 0
  const computedMonthly = tenureNum > 0 && total > 0 ? Math.ceil(total / tenureNum) : 0

  const payoffDate = tenureNum > 0
    ? addMonths(getMonthStr(startMonth.year, startMonth.month), tenureNum - 1)
    : null

  if (!open) return null

  function handleSubmit() {
    setError(null)
    if (!name.trim()) return setError('Name is required')
    if (!accountId) return setError('Account is required')
    if (total <= 0) return setError('Total amount must be > 0')
    if (tenureNum <= 0) return setError('Number of installment months is required')

    startTransition(async () => {
      const res = await createInstallment({
        name: name.trim(),
        account_id: accountId,
        total_amount: total,
        monthly_amount: computedMonthly,
        start_month: getMonthStr(startMonth.year, startMonth.month),
        tenure_months: tenureNum,
        notes: notes.trim() || null,
      })
      if (res.error) {
        setError(res.error)
      } else {
        onSuccess()
        onClose()
        setName(''); setTotalAmount(''); setTenure(''); setNotes('')
      }
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', width: 500, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Add Installment</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, lineHeight: 0 }}><IconClose /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Name">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. iPhone 15 installment" style={inputStyle} />
          </Field>

          <Field label="Linked Account">
            <select value={accountId} onChange={e => setAccountId(e.target.value)} style={inputStyle}>
              {eligibleAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Total Amount (Rp)">
              <input value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0" style={inputStyle} />
            </Field>
            <Field label="Monthly Amount (auto-calculated)">
              <div style={{ padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)' }}>
                {computedMonthly > 0 ? formatIDR(computedMonthly) : '—'}
              </div>
            </Field>
          </div>

          <Field label="Start Month">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => {
                const d = new Date(startMonth.year, startMonth.month - 2, 1)
                setStartMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
              }} style={{ ...secondaryBtn, padding: '4px 10px' }}>←</button>
              <span style={{ fontSize: 13, fontWeight: 500, minWidth: 120, textAlign: 'center' }}>
                {MONTH_NAMES_FULL[startMonth.month - 1]} {startMonth.year}
              </span>
              <button onClick={() => {
                const d = new Date(startMonth.year, startMonth.month, 1)
                setStartMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
              }} style={{ ...secondaryBtn, padding: '4px 10px' }}>→</button>
            </div>
          </Field>

          <Field label="Number of installment months">
            <input value={tenure} onChange={e => setTenure(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 12" style={inputStyle} />
          </Field>

          {tenureNum > 0 && payoffDate && (
            <div style={{ padding: '10px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--accent)' }}>
              <strong>{tenureNum} monthly payments</strong> of {formatIDR(computedMonthly)} · Paid off: {monthLabel(payoffDate)}
            </div>
          )}

          <Field label="Notes (optional)">
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" style={inputStyle} />
          </Field>

          {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius-md)' }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={handleSubmit} disabled={isPending} style={primaryBtn}>
            {isPending ? 'Saving…' : 'Create Installment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 12px',
  background: 'var(--bg-surface)', color: 'var(--text-primary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
  fontSize: 13, outline: 'none', fontFamily: 'inherit',
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none',
  background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
}
const secondaryBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)', background: 'transparent',
  color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
}
const ghostBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none',
  background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
}
const destructiveBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--red-border)', background: 'var(--red-dim)',
  color: 'var(--red)', fontSize: 13, fontWeight: 500, cursor: 'pointer', flex: 1,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{label}</label>
      {children}
    </div>
  )
}

// ── Archive List ──────────────────────────────────────────────────────────────
function ArchiveList({ items }: { items: InstallmentWithComputed[] }) {
  if (items.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        No archived installments
      </div>
    )
  }
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {items.map((inst, i) => (
        <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{inst.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{inst.account_name} · {inst.tenure_months} months</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{formatIDR(inst.total_amount)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Paid off {monthLabel(inst.payoff_month)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Calendar ─────────────────────────────────────────────────────────────
interface InstallmentsCalendarProps {
  initialActive: InstallmentWithComputed[]
  initialCompleted: InstallmentWithComputed[]
  ccAccounts: Account[]
  loanAccounts: Account[]
}

export function InstallmentsCalendar({ initialActive, initialCompleted, ccAccounts, loanAccounts }: InstallmentsCalendarProps) {
  const [tab, setTab] = useState<'active' | 'archive'>('active')
  const [active, setActive] = useState(initialActive)
  const [completed, setCompleted] = useState(initialCompleted)
  const [selectedInst, setSelectedInst] = useState<InstallmentWithComputed | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const eligibleAccounts = [...ccAccounts, ...loanAccounts]

  // Build 12 months starting from current
  const cur = currentMonthStr()
  const months = Array.from({ length: 12 }, (_, i) => addMonths(cur, i))

  // Unique account names for color mapping
  const allAccountNames = Array.from(new Set(active.map(i => i.account_name)))

  function refresh() {
    startTransition(async () => {
      const [a, c] = await Promise.all([getActiveInstallments(), getCompletedInstallments()])
      setActive(a)
      setCompleted(c)
    })
  }

  function openDetail(inst: InstallmentWithComputed) {
    setSelectedInst(inst)
    setDetailOpen(true)
  }

  const detailColor = selectedInst ? accountColor(selectedInst.account_name, allAccountNames) : 'var(--accent)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Installments</h1>
        <button onClick={() => setAddOpen(true)} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPlus /> Add Installment
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
        {(['active', 'archive'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', transition: 'all 0.12s',
            border: `1px solid ${tab === t ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
            background: tab === t ? 'var(--accent-dim)' : 'transparent',
            color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: tab === t ? 600 : 500,
          }}>
            {t === 'active' ? 'Active' : 'Archive'}
          </button>
        ))}
        {isPending && <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 8 }}>Loading…</span>}
      </div>

      {tab === 'active' ? (
        <>
          {active.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              No active installments. Click &quot;Add Installment&quot; to get started.
            </div>
          ) : (
            /* Horizontal scrollable calendar grid */
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: months.map(() => '240px').join(' '), gap: 14, minWidth: 'max-content', alignContent: 'start' }}>
                {months.map(monthStr => {
                  const isCurrentMonth = monthStr === cur
                  const activeInMonth = active.filter(i => isActiveInMonth(i, monthStr))
                  const activeCC = activeInMonth.filter(i => i.account_type === 'Credit Card')
                  const activeLoan = activeInMonth.filter(i => i.account_type === 'Loan')
                  const totalForMonth = activeInMonth.reduce((s, i) => s + i.monthly_amount, 0)

                  return (
                    <div key={monthStr} style={{
                      display: 'flex', flexDirection: 'column',
                      borderRadius: 'var(--radius-lg)', padding: 12,
                      border: isCurrentMonth ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                      background: isCurrentMonth ? 'rgba(59,130,246,0.04)' : 'transparent',
                    }}>
                      {/* Month header */}
                      <div style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: isCurrentMonth ? 'var(--accent)' : 'var(--text-muted)',
                        paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border-subtle)',
                      }}>
                        {monthLabel(monthStr)}
                      </div>

                      {/* Installment cards */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: activeInMonth.length > 0 ? 10 : 0 }}>
                        {activeInMonth.length === 0 ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No installments</div>
                        ) : (
                          <>
                            {activeCC.map(inst => (
                              <InstallmentCard
                                key={inst.id}
                                inst={inst}
                                color={accountColor(inst.account_name, allAccountNames)}
                                isFinal={isFinalPayment(inst, monthStr)}
                                onClick={() => openDetail(inst)}
                              />
                            ))}
                            {activeLoan.length > 0 && (
                              <>
                                <div style={{
                                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                                  color: 'var(--text-muted)', marginTop: activeCC.length > 0 ? 8 : 0, marginBottom: 6,
                                }}>
                                  Loan Installments
                                </div>
                                {activeLoan.map(inst => (
                                  <InstallmentCard
                                    key={inst.id}
                                    inst={inst}
                                    color={accountColor(inst.account_name, allAccountNames)}
                                    isFinal={isFinalPayment(inst, monthStr)}
                                    onClick={() => openDetail(inst)}
                                  />
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Month total */}
                      {activeInMonth.length > 0 && (
                        <div style={{
                          padding: '8px 10px', background: 'rgba(255,255,255,0.03)',
                          borderRadius: 'var(--radius-md)', borderTop: '1px solid var(--border-subtle)',
                          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                          display: 'flex', justifyContent: 'space-between',
                        }}>
                          <span>Total:</span>
                          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{formatIDR(totalForMonth)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <ArchiveList items={completed} />
      )}

      {/* Detail Slide-Over */}
      <DetailSlideOver
        inst={selectedInst}
        open={detailOpen}
        color={detailColor}
        onClose={() => setDetailOpen(false)}
        onPaidOff={refresh}
      />

      {/* Add Installment Modal */}
      <AddInstallmentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={refresh}
        eligibleAccounts={eligibleAccounts}
      />
    </div>
  )
}

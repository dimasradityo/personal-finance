'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { formatIDR } from '@/lib/utils/currency'
import type { PLData } from '@/lib/pl/queries'

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconAlert({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function IconChevronR({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function IconChevronD({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function IconClose({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function IconArrowDown({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  )
}

function IconArrowUp({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="12" y1="19" x2="12" y2="5"/>
      <polyline points="5 12 12 5 19 12"/>
    </svg>
  )
}

// ── Drill-down types ──────────────────────────────────────────────────────────
type DrillTarget =
  | { kind: 'cc'; accountId: string; accountName: string }
  | { kind: 'loan'; accountId: string; accountName: string }
  | { kind: 'income' | 'expense'; category: string }
  | { kind: 'savings'; destination: string }

// ── P&L Primitives ────────────────────────────────────────────────────────────
function PLSectionHeader({ label, color, total }: { label: string; color: string; total?: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px',
      background: 'var(--bg-elevated)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ width: 3, height: 15, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', flex: 1 }}>
        {label}
      </span>
      {total != null && (
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatIDR(total)}</span>
      )}
    </div>
  )
}

function PLRow({
  label, sublabel, amount, zero, warning, onClick, subtype,
}: {
  label: string
  sublabel?: string
  amount: number
  zero?: boolean
  warning?: string
  onClick?: () => void
  subtype?: 'cc' | 'loan'
}) {
  const [hov, setHov] = useState(false)
  const [tip, setTip] = useState(false)
  const subtypeColor = subtype === 'loan' ? 'var(--orange)' : subtype === 'cc' ? 'var(--accent)' : null

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTip(false) }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', padding: '9px 16px 9px 20px',
        background: hov && onClick ? 'rgba(255,255,255,0.025)' : 'transparent',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
      }}
    >
      {subtypeColor && (
        <div style={{ width: 2, height: 12, background: subtypeColor, borderRadius: 1, marginRight: 10, flexShrink: 0, opacity: 0.6 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
        {sublabel && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{sublabel}</span>}
      </div>
      {warning && (
        <span
          style={{ position: 'relative', marginRight: 10, display: 'inline-flex', cursor: 'help' }}
          onMouseEnter={e => { e.stopPropagation(); setTip(true) }}
          onMouseLeave={() => setTip(false)}
        >
          <IconAlert size={13} color="var(--amber)" />
          {tip && (
            <span style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
              background: 'var(--bg-elevated)', border: '1px solid var(--amber-border)',
              padding: '5px 9px', borderRadius: 'var(--radius-sm)', fontSize: 11,
              whiteSpace: 'nowrap', color: 'var(--amber)', zIndex: 200,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}>{warning}</span>
          )}
        </span>
      )}
      <span className="font-mono" style={{
        fontSize: 13, fontWeight: 500,
        color: zero ? 'var(--text-muted)' : 'var(--text-primary)',
        minWidth: 110, textAlign: 'right',
      }}>
        {zero ? 'Rp0' : formatIDR(amount)}
      </span>
      <div style={{ width: 20, display: 'flex', justifyContent: 'center', marginLeft: 4 }}>
        {onClick && (
          <span style={{ opacity: hov ? 1 : 0, transition: 'opacity 0.1s' }}>
            <IconChevronR size={13} color="var(--text-muted)" />
          </span>
        )}
      </div>
    </div>
  )
}

function PLTotalRow({ label, amount, color }: { label: string; amount: number; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '10px 16px 10px 20px',
      background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{ flex: 1, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: color || 'var(--text-secondary)' }}>
        {label}
      </span>
      <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--text-primary)', minWidth: 110, textAlign: 'right' }}>
        {formatIDR(amount)}
      </span>
      <div style={{ width: 20 }} />
    </div>
  )
}

function PLDisposableRow({ amount }: { amount: number }) {
  const neg = amount < 0
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '16px 20px',
      background: neg ? 'var(--red-dim)' : 'var(--green-dim)',
      borderTop: `2px solid ${neg ? 'var(--red-border)' : 'var(--green-border)'}`,
      borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
    }}>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: neg ? 'var(--red)' : 'var(--green)', fontFamily: 'inherit' }}>
        Disposable Income
      </span>
      <span className="font-mono" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em', color: neg ? 'var(--red)' : 'var(--green)' }}>
        {neg ? '−' : '+'}{formatIDR(Math.abs(amount))}
      </span>
    </div>
  )
}

// ── Actuals Table ─────────────────────────────────────────────────────────────
function ActualsTable({ data, onDrill }: { data: PLData; onDrill: (t: DrillTarget) => void }) {
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxWidth: 640 }}>
      {/* Income */}
      <PLSectionHeader label="Income" color="var(--green)" total={data.totals.income} />
      {data.income.map(r => (
        <PLRow key={r.category} label={r.category} amount={r.amount}
          onClick={() => onDrill({ kind: 'income', category: r.category })} />
      ))}
      {data.income.length === 0 && (
        <div style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)' }}>No income this month</div>
      )}
      <PLTotalRow label="Total Income" amount={data.totals.income} color="var(--green)" />

      {/* Fixed Repayments */}
      <PLSectionHeader label="Fixed Repayments" color="var(--red)" total={data.totals.repayments} />
      {data.repayments.map(r => (
        <PLRow
          key={r.account_id}
          label={r.account_name}
          amount={r.amount}
          zero={r.amount === 0}
          warning={r.has_statement_date_warning ? 'No statement date configured — using calendar month' : undefined}
          subtype={r.account_type === 'Credit Card' ? 'cc' : 'loan'}
          onClick={() => onDrill(r.account_type === 'Credit Card'
            ? { kind: 'cc', accountId: r.account_id, accountName: r.account_name }
            : { kind: 'loan', accountId: r.account_id, accountName: r.account_name }
          )}
        />
      ))}
      {data.repayments.length === 0 && data.loanInstallments.length === 0 && (
        <div style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)' }}>No repayments this month</div>
      )}
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
      <PLTotalRow label="Total Repayments" amount={data.totals.repayments} color="var(--red)" />

      {/* Budgeted Expenses */}
      <PLSectionHeader label="Budgeted Expenses" color="var(--amber)" total={data.totals.expenses} />
      {data.expenses.map(r => (
        <PLRow key={r.category} label={r.category} amount={r.amount}
          zero={r.amount === 0}
          onClick={() => onDrill({ kind: 'expense', category: r.category })} />
      ))}
      {data.expenses.length === 0 && (
        <div style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)' }}>No expenses this month</div>
      )}
      <PLTotalRow label="Total Expenses" amount={data.totals.expenses} color="var(--amber)" />

      {/* Savings / Investments */}
      <PLSectionHeader label="Savings / Investments" color="var(--purple)" total={data.totals.savings} />
      {data.savings.map(r => (
        <PLRow key={r.destination_account} label={r.destination_account} amount={r.amount}
          onClick={() => onDrill({ kind: 'savings', destination: r.destination_account })} />
      ))}
      {data.savings.length === 0 && (
        <div style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)' }}>No savings this month</div>
      )}
      <PLTotalRow label="Total Savings" amount={data.totals.savings} color="var(--purple)" />

      {/* Disposable */}
      <PLDisposableRow amount={data.totals.disposable_income} />
    </div>
  )
}

// ── Drill-down Panel ──────────────────────────────────────────────────────────
type DrillData = {
  kind: 'cc'
  account: { name: string; statement_date: number | null }
  transactions: Array<{ id: string; date: string; merchant: string; amount: number; installment_converted: boolean; category?: { name: string } | null }>
  installments: Array<{ id: string; name: string; monthly_amount: number }>
  cycleLabel: string
  subtotal: number
  installmentTotal: number
  grandTotal: number
  hasStatementDateWarning: boolean
} | {
  kind: 'loan'
  account: { name: string }
  transactions: Array<{ id: string; date: string; merchant: string; amount: number; installment_converted: boolean; category?: { name: string } | null }>
} | {
  kind: 'income' | 'expense'
  category: string
  transactions: Array<{ id: string; date: string; merchant: string; amount: number; category?: { name: string } | null }>
} | {
  kind: 'savings'
  destination: string
  transactions: Array<{ id: string; date: string; merchant: string; amount: number }>
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TxLink({ id, year, month }: { id: string; year: number; month: number }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(`/transactions?highlight=${id}&year=${year}&month=${month}`)}
      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}
    >→</button>
  )
}

function CCDrillContent({
  data, year, month, drillView, onViewChange,
}: {
  data: Extract<DrillData, { kind: 'cc' }>
  year: number
  month: number
  drillView: 'transactions' | 'breakdown'
  onViewChange: (v: 'transactions' | 'breakdown') => void
}) {
  // Spend breakdown by category
  const catMap = new Map<string, { count: number; total: number; txs: typeof data.transactions }>()
  for (const tx of data.transactions) {
    if (tx.installment_converted) continue
    const cat = tx.category?.name ?? 'Others'
    const existing = catMap.get(cat) ?? { count: 0, total: 0, txs: [] }
    catMap.set(cat, { count: existing.count + 1, total: existing.total + tx.amount, txs: [...existing.txs, tx] })
  }
  const cats = Array.from(catMap.entries())
    .map(([cat, v]) => ({ cat, ...v }))
    .sort((a, b) => b.total - a.total)
  const maxTotal = Math.max(...cats.map(c => c.total), 1)

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const toggleCat = (cat: string) => setExpandedCats(prev => {
    const n = new Set(prev)
    if (n.has(cat)) { n.delete(cat) } else { n.add(cat) }
    return n
  })

  return (
    <>
      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['transactions', 'breakdown'] as const).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-md)',
              border: `1px solid ${drillView === v ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              background: drillView === v ? 'var(--accent-dim)' : 'transparent',
              color: drillView === v ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
              textTransform: 'capitalize',
            }}
          >
            {v === 'transactions' ? 'Transactions' : 'Breakdown'}
          </button>
        ))}
      </div>

      {drillView === 'transactions' ? (
        <div>
          <div style={{ padding: '4px 0 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 2 }}>
            CC Spend transactions
          </div>
          {data.transactions.map(tx => (
            <div key={tx.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
              borderBottom: '1px solid var(--border-subtle)',
              opacity: tx.installment_converted ? 0.45 : 1,
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 42 }}>{formatDate(tx.date)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.merchant}</div>
                {tx.installment_converted ? (
                  <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', color: 'var(--amber)', marginTop: 3, display: 'inline-block' }}>
                    Converted to Installment · excluded
                  </span>
                ) : tx.category ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.category.name}</span>
                ) : null}
              </div>
              <span className="font-mono" style={{ fontSize: 13, fontWeight: 500, color: tx.installment_converted ? 'var(--text-muted)' : 'var(--text-primary)', flexShrink: 0 }}>
                {tx.installment_converted
                  ? <s style={{ opacity: 0.5 }}>{formatIDR(tx.amount)}</s>
                  : formatIDR(tx.amount)}
              </span>
              <TxLink id={tx.id} year={year} month={month} />
            </div>
          ))}

          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '2px solid var(--border-default)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Subtotal (excl. converted)</span>
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{formatIDR(data.subtotal)}</span>
          </div>

          {/* Installments */}
          {data.installments.length > 0 && (
            <>
              <div style={{ padding: '12px 0 6px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 8 }}>
                Installment items
              </div>
              {data.installments.map(inst => (
                <div key={inst.id} style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border-subtle)', gap: 10 }}>
                  <div style={{ width: 2, height: 12, background: 'var(--purple)', borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{inst.name}</span>
                  <span className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>{formatIDR(inst.monthly_amount)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '2px solid var(--border-default)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Subtotal installments</span>
                <span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{formatIDR(data.installmentTotal)}</span>
              </div>
            </>
          )}

          {/* Grand total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 4px' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Grand Total</span>
            <span className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.02em' }}>{formatIDR(data.grandTotal)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingBottom: 8 }}>Matches P&L repayments row exactly</div>
        </div>
      ) : (
        <div>
          <div style={{ padding: '4px 0 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 4 }}>
            Spend by category
          </div>
          {cats.map(c => {
            const isOpen = expandedCats.has(c.cat)
            const pct = (c.total / maxTotal) * 100
            const isOthers = c.cat === 'Others'
            return (
              <div key={c.cat} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div
                  onClick={() => toggleCat(c.cat)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', cursor: 'pointer' }}
                >
                  {isOpen ? <IconChevronD size={13} color="var(--text-muted)" /> : <IconChevronR size={13} color="var(--text-muted)" />}
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{c.cat}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 12 }}>{c.count} txn</span>
                  <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginRight: 10 }}>
                    <div style={{ height: '100%', width: pct + '%', background: isOthers ? 'var(--amber)' : 'var(--accent)', borderRadius: 99 }} />
                  </div>
                  <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: 'right', color: isOthers ? 'var(--amber)' : 'var(--text-primary)' }}>
                    {formatIDR(c.total)}
                  </span>
                </div>
                {isOpen && (
                  <div style={{ paddingLeft: 24, paddingBottom: 6, background: 'rgba(255,255,255,0.015)', borderRadius: 'var(--radius-sm)' }}>
                    {c.txs.map((tx, i) => (
                      <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < c.txs.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 42 }}>{formatDate(tx.date)}</span>
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{tx.merchant}</span>
                        <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{formatIDR(tx.amount)}</span>
                        <TxLink id={tx.id} year={year} month={month} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 4px', borderTop: '2px solid var(--border-default)', marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Total <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(excl. converted)</span>
            </span>
            <span className="font-mono" style={{ fontSize: 16, fontWeight: 700 }}>{formatIDR(data.subtotal)}</span>
          </div>
        </div>
      )}
    </>
  )
}

function GenericTxList({ transactions, year, month }: {
  transactions: Array<{ id: string; date: string; merchant: string; amount: number; category?: { name: string } | null }>
  year: number
  month: number
}) {
  const total = transactions.reduce((s, t) => s + t.amount, 0)
  return (
    <div>
      {transactions.map(tx => (
        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 42 }}>{formatDate(tx.date)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.merchant}</div>
            {tx.category && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.category.name}</span>}
          </div>
          <span className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>{formatIDR(tx.amount)}</span>
          <TxLink id={tx.id} year={year} month={month} />
        </div>
      ))}
      {transactions.length === 0 && (
        <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>No transactions</div>
      )}
      {transactions.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid var(--border-default)', marginTop: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Total</span>
          <span className="font-mono" style={{ fontSize: 14, fontWeight: 700 }}>{formatIDR(total)}</span>
        </div>
      )}
    </div>
  )
}

// ── Drill-over Panel ──────────────────────────────────────────────────────────
function DrillPanel({
  drill,
  drillData,
  loading,
  year,
  month,
  onClose,
}: {
  drill: DrillTarget | null
  drillData: DrillData | null
  loading: boolean
  year: number
  month: number
  onClose: () => void
}) {
  const [drillView, setDrillView] = useState<'transactions' | 'breakdown'>('transactions')

  if (!drill) return null

  const title = drill.kind === 'cc' || drill.kind === 'loan'
    ? drill.accountName
    : drill.kind === 'savings'
      ? drill.destination
      : drill.category

  const subtitle = drill.kind === 'cc' && drillData?.kind === 'cc'
    ? `Billing Cycle · ${drillData.cycleLabel}`
    : drill.kind === 'loan'
      ? 'Loan Repayments'
      : drill.kind === 'income'
        ? 'Income'
        : drill.kind === 'expense'
          ? 'Expense'
          : 'Savings / Investment'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
      {/* Backdrop */}
      <div
        style={{ flex: 1, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div style={{
        width: 440, height: '100%', background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-default)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        animation: 'slideInR 0.3s cubic-bezier(0.22,1,0.36,1) forwards',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 0, padding: 4 }}>
              <IconClose size={16} />
            </button>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 20px' }}>
          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : !drillData ? null : drillData.kind === 'cc' ? (
            <CCDrillContent data={drillData} year={year} month={month} drillView={drillView} onViewChange={setDrillView} />
          ) : drillData.kind === 'loan' ? (
            <GenericTxList transactions={drillData.transactions as never} year={year} month={month} />
          ) : drillData.kind === 'income' || drillData.kind === 'expense' ? (
            <GenericTxList transactions={drillData.transactions as never} year={year} month={month} />
          ) : drillData.kind === 'savings' ? (
            <GenericTxList transactions={drillData.transactions as never} year={year} month={month} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── Projection View ────────────────────────────────────────────────────────────
type ProjectionData = {
  projections: PLData[]
  actualMonthsUsed: number
}

const PROJ_SECTIONS = [
  { key: 'income' as const, label: 'Total Income', color: 'var(--green)' },
  { key: 'repayments' as const, label: 'Total Repayments', color: 'var(--red)' },
  { key: 'expenses' as const, label: 'Total Expenses', color: 'var(--amber)' },
  { key: 'savings' as const, label: 'Total Savings', color: 'var(--purple)' },
]

function monthLabel(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function TrendArrow({ curr, prev, invertColor }: { curr: number; prev: number | null; invertColor?: boolean }) {
  if (prev == null) return null
  const down = curr < prev
  const same = curr === prev
  if (same) return null
  const positive = invertColor ? down : !down
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 4 }}>
      {down
        ? <IconArrowDown size={10} color={positive ? 'var(--green)' : 'var(--red)'} />
        : <IconArrowUp size={10} color={positive ? 'var(--green)' : 'var(--red)'} />}
    </span>
  )
}

function ProjectionTable({ data }: { data: ProjectionData }) {
  const { projections, actualMonthsUsed } = data
  return (
    <div>
      {actualMonthsUsed < 3 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 12, color: 'var(--red)' }}>
          <IconAlert size={13} color="var(--red)" />
          Projection uses {actualMonthsUsed} month{actualMonthsUsed !== 1 ? 's' : ''} of data — may be less accurate
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: 12, color: 'var(--amber)' }}>
        <IconAlert size={13} color="var(--amber)" />
        Estimates based on 3-month rolling averages · Active installments included at fixed amounts
      </div>

      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxWidth: 760 }}>
        {/* Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${projections.length}, 160px)`, background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)', padding: '10px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Section</div>
          {projections.map(p => (
            <div key={p.month} style={{ textAlign: 'right', paddingRight: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{monthLabel(p.month)}</div>
            </div>
          ))}
        </div>

        {/* Section rows */}
        {PROJ_SECTIONS.map(sec => (
          <div key={sec.key} style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${projections.length}, 160px)`, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', borderLeft: `3px solid ${sec.color}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: sec.color, letterSpacing: '0.02em' }}>{sec.label}</span>
            {projections.map((p, i) => {
              const val = p.totals[sec.key]
              const prev = i > 0 ? projections[i - 1].totals[sec.key] : null
              return (
                <div key={p.month} style={{ textAlign: 'right', paddingRight: 20, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span className="font-mono" style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', borderBottom: '1px dashed rgba(255,255,255,0.15)' }}>
                    {formatIDR(val)}
                  </span>
                  <TrendArrow curr={val} prev={prev} invertColor={sec.key !== 'income'} />
                </div>
              )
            })}
          </div>
        ))}

        {/* Divider */}
        <div style={{ height: 2, background: 'var(--border-default)' }} />

        {/* Disposable */}
        <div style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${projections.length}, 160px)`, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Disposable Income</span>
          {projections.map((p, i) => {
            const val = p.totals.disposable_income
            const prev = i > 0 ? projections[i - 1].totals.disposable_income : null
            const pos = val >= 0
            return (
              <div key={p.month} style={{ textAlign: 'right', paddingRight: 20, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <span className="font-mono" style={{ fontSize: 15, fontWeight: 700, color: pos ? 'var(--green)' : 'var(--red)' }}>
                  {pos ? '+' : '−'}{formatIDR(Math.abs(val))}
                </span>
                <TrendArrow curr={val} prev={prev} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
interface PLDashboardProps {
  initialData: PLData
  initialYear: number
  initialMonth: number
}

export function PLDashboard({ initialData, initialYear, initialMonth }: PLDashboardProps) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [data, setData] = useState<PLData>(initialData)
  const [view, setView] = useState<'actuals' | 'projection'>('actuals')
  const [projectionData, setProjectionData] = useState<ProjectionData | null>(null)
  const [drill, setDrill] = useState<DrillTarget | null>(null)
  const [drillData, setDrillData] = useState<DrillData | null>(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleMonthChange = (val: { year: number; month: number }) => {
    setYear(val.year)
    setMonth(val.month)
    startTransition(async () => {
      const res = await fetch(`/api/pl?year=${val.year}&month=${val.month}`)
      const json = await res.json()
      setData(json)
    })
  }

  const handleViewChange = (v: 'actuals' | 'projection') => {
    setView(v)
    if (v === 'projection' && !projectionData) {
      startTransition(async () => {
        const res = await fetch('/api/pl/projection')
        const json = await res.json()
        setProjectionData(json)
      })
    }
  }

  const handleDrill = async (target: DrillTarget) => {
    setDrill(target)
    setDrillData(null)
    setDrillLoading(true)

    try {
      let url = ''
      if (target.kind === 'cc') {
        url = `/api/pl/drill?kind=cc&accountId=${target.accountId}&year=${year}&month=${month}`
      } else if (target.kind === 'loan') {
        url = `/api/pl/drill?kind=loan&accountId=${target.accountId}&year=${year}&month=${month}`
      } else if (target.kind === 'income') {
        url = `/api/pl/drill?kind=income&category=${encodeURIComponent(target.category)}&year=${year}&month=${month}`
      } else if (target.kind === 'expense') {
        url = `/api/pl/drill?kind=expense&category=${encodeURIComponent(target.category)}&year=${year}&month=${month}`
      } else if (target.kind === 'savings') {
        url = `/api/pl/drill?kind=savings&destination=${encodeURIComponent(target.destination)}&year=${year}&month=${month}`
      }
      const res = await fetch(url)
      const json = await res.json()
      setDrillData(json)
    } finally {
      setDrillLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <MonthPicker
          value={{ year, month }}
          onChange={handleMonthChange}
        />
        <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
          {(['actuals', 'projection'] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              style={{
                padding: '6px 16px', border: 'none', fontSize: 13,
                fontWeight: view === v ? 600 : 400,
                background: view === v ? 'var(--accent)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.12s',
                borderLeft: i === 1 ? '1px solid var(--border-default)' : 'none',
                textTransform: 'capitalize',
              }}
            >
              {v === 'actuals' ? 'Actuals' : 'Projection'}
            </button>
          ))}
        </div>
        {isPending && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</span>
        )}
      </div>

      {/* Content */}
      {view === 'actuals' ? (
        <>
          <ActualsTable data={data} onDrill={handleDrill} />
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingLeft: 4 }}>
            {(['CC billing cycle|var(--accent)', 'Loan repayment|var(--orange)']).map(item => {
              const [label, color] = item.split('|')
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ width: 8, height: 2, background: color, borderRadius: 1 }} />
                  {label}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        projectionData ? (
          <ProjectionTable data={projectionData} />
        ) : (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {isPending ? 'Computing projection…' : 'Loading projection…'}
          </div>
        )
      )}

      {/* Drill-down panel */}
      {drill && (
        <DrillPanel
          drill={drill}
          drillData={drillData}
          loading={drillLoading}
          year={year}
          month={month}
          onClose={() => { setDrill(null); setDrillData(null) }}
        />
      )}

      <style>{`
        @keyframes slideInR {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

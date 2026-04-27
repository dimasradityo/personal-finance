'use client'

import { useState } from 'react'
import { Account } from '@/types'
import { formatIDR } from '@/lib/utils/currency'
import { SlideOver } from '@/components/ui/SlideOver'
import { AccountForm } from '@/components/accounts/AccountForm'
import { DeleteAccountModal } from '@/components/accounts/DeleteAccountModal'
import { getTransactionCountForAccount } from '@/lib/actions/accounts'

interface AccountsPageClientProps {
  accounts: Account[]
  usdtRate: number | null
}

const TYPE_COLORS: Record<string, string> = {
  Debit: 'var(--accent)',
  'Credit Card': 'var(--amber)',
  'E-Wallet': 'var(--green)',
  'Crypto Wallet': 'var(--purple)',
  'Loan': 'var(--red)',
}

const TYPE_LABELS: Record<string, { bg: string; border: string; color: string }> = {
  Debit: { bg: 'var(--accent-dim)', border: 'var(--accent-border)', color: 'var(--accent)' },
  'Credit Card': { bg: 'var(--amber-dim)', border: 'var(--amber-border)', color: 'var(--amber)' },
  'E-Wallet': { bg: 'var(--green-dim)', border: 'var(--green-border)', color: 'var(--green)' },
  'Crypto Wallet': { bg: 'var(--purple-dim)', border: 'var(--purple-border)', color: 'var(--purple)' },
  'Loan': { bg: 'var(--red-dim)', border: 'var(--red-border)', color: 'var(--red)' },
}

export function AccountsPageClient({ accounts, usdtRate }: AccountsPageClientProps) {
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [txCount, setTxCount] = useState(0)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const netWorth = accounts.reduce((sum, acc) => {
    if (acc.type === 'Credit Card') {
      return sum - acc.balance
    }
    return sum + acc.balance
  }, 0)

  function openCreate() {
    setEditingAccount(undefined)
    setSlideOverOpen(true)
  }

  function openEdit(acc: Account) {
    setEditingAccount(acc)
    setSlideOverOpen(true)
    setMenuOpenId(null)
  }

  async function openDelete(acc: Account) {
    const count = await getTransactionCountForAccount(acc.id)
    setTxCount(count)
    setDeletingAccount(acc)
    setMenuOpenId(null)
  }

  function handleSuccess() {
    setSlideOverOpen(false)
    setEditingAccount(undefined)
  }

  function handleDeleteConfirm() {
    setDeletingAccount(null)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Accounts
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Net worth:{' '}
            <span className="font-semibold" style={{ color: netWorth >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {netWorth >= 0 ? '' : '-'}{formatIDR(Math.abs(netWorth))}
            </span>
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + Add Account
        </button>
      </div>

      {/* Account card grid */}
      <div
        className="grid gap-[14px]"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        {accounts.map((acc) => {
          const typeColors = TYPE_LABELS[acc.type]
          const stripeColor = TYPE_COLORS[acc.type]
          const isCC = acc.type === 'Credit Card'
          const creditLimit = acc.credit_limit ?? 0
          const utilizationPct = creditLimit > 0 ? Math.round((acc.balance / creditLimit) * 100) : 0
          const barColor =
            utilizationPct >= 90
              ? 'var(--red)'
              : utilizationPct >= 70
              ? 'var(--amber)'
              : 'var(--green)'

          // Days until due
          let daysUntilDue: number | null = null
          if (acc.payment_due_date != null) {
            const today = new Date()
            const due = new Date(today.getFullYear(), today.getMonth(), acc.payment_due_date)
            if (due < today) due.setMonth(due.getMonth() + 1)
            daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          }

          return (
            <div
              key={acc.id}
              onClick={() => openEdit(acc)}
              className="relative rounded-lg overflow-hidden cursor-pointer transition-colors"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                padding: 20,
              }}
            >
              {/* Left accent stripe */}
              <div
                className="absolute left-0 top-0 bottom-0"
                style={{ width: 3, background: stripeColor }}
              />

              {/* 3-dot menu */}
              <div
                className="absolute top-3 right-3"
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === acc.id ? null : acc.id) }}
              >
                <button
                  className="rounded-md px-2 py-1 text-xs transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Account options"
                >
                  •••
                </button>
                {menuOpenId === acc.id && (
                  <div
                    className="absolute right-0 top-7 z-10 rounded-md shadow-lg overflow-hidden"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      minWidth: 120,
                    }}
                  >
                    <button
                      className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/5"
                      style={{ color: 'var(--text-primary)' }}
                      onClick={(e) => { e.stopPropagation(); openEdit(acc) }}
                    >
                      Edit
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/5"
                      style={{ color: 'var(--red)' }}
                      onClick={(e) => { e.stopPropagation(); openDelete(acc) }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Top row: name + badge */}
              <div className="pl-3 flex items-center gap-2 mb-3 pr-8">
                <span className="font-semibold text-[15px] truncate" style={{ color: 'var(--text-primary)' }}>
                  {acc.name}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold border shrink-0"
                  style={{
                    background: typeColors.bg,
                    borderColor: typeColors.border,
                    color: typeColors.color,
                  }}
                >
                  {acc.type}
                </span>
              </div>

              <div className="pl-3">
                {isCC ? (
                  <>
                    {/* Outstanding */}
                    <div className="mb-2">
                      <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Outstanding</p>
                      <p
                        className="font-mono font-bold text-[20px]"
                        style={{ color: 'var(--red)' }}
                      >
                        -{formatIDR(acc.balance)}
                      </p>
                    </div>

                    {/* Utilization bar */}
                    <div className="mb-1.5">
                      <div
                        className="rounded-full overflow-hidden"
                        style={{ height: 4, background: 'rgba(255,255,255,0.08)' }}
                      >
                        <div
                          className="rounded-full h-full transition-all"
                          style={{
                            width: `${Math.min(utilizationPct, 100)}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-[11px] mb-2">
                      <span style={{ color: barColor }}>{utilizationPct}% utilized</span>
                      <span style={{ color: 'var(--text-muted)' }}>of {formatIDR(creditLimit)}</span>
                    </div>

                    {/* Statement / Due */}
                    <div
                      className="flex justify-between text-[11px] pt-2"
                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                    >
                      {acc.statement_date != null && (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Statement: {acc.statement_date}th
                        </span>
                      )}
                      {acc.payment_due_date != null && daysUntilDue != null && (
                        <span style={{ color: daysUntilDue <= 7 ? 'var(--amber)' : 'var(--text-secondary)' }}>
                          Due: {acc.payment_due_date}th · {daysUntilDue}d
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Balance</p>
                    <p
                      className="font-mono font-bold text-[20px]"
                      style={{ color: acc.balance >= 0 ? 'var(--green)' : 'var(--red)' }}
                    >
                      {formatIDR(acc.balance)}
                    </p>

                    {/* USDT rate chip for Crypto Wallet */}
                    {acc.type === 'Crypto Wallet' && usdtRate != null && (
                      <div className="mt-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border"
                          style={{
                            background: 'var(--purple-dim)',
                            borderColor: 'var(--purple-border)',
                            color: 'var(--purple)',
                          }}
                        >
                          ⟳ 1 USDT ≈ {formatIDR(usdtRate)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {accounts.length === 0 && (
          <div
            className="col-span-full rounded-lg p-12 text-center"
            style={{ border: '1px dashed var(--border-default)' }}
          >
            <p style={{ color: 'var(--text-muted)' }}>No accounts yet. Add your first account.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Slide-over */}
      <SlideOver
        open={slideOverOpen}
        onClose={() => { setSlideOverOpen(false); setEditingAccount(undefined) }}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
      >
        <AccountForm
          account={editingAccount}
          onSuccess={handleSuccess}
          onClose={() => { setSlideOverOpen(false); setEditingAccount(undefined) }}
        />
      </SlideOver>

      {/* Delete modal */}
      {deletingAccount && (
        <DeleteAccountModal
          account={deletingAccount}
          transactionCount={txCount}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingAccount(null)}
        />
      )}
    </div>
  )
}

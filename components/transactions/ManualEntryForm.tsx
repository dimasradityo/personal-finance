'use client'

import { useState, useTransition } from 'react'
import { Account, Category, IngestionError, TransactionType } from '@/types'
import { createTransaction, resolveIngestionError } from '@/lib/actions/transactions'
import { getUsdtRate } from '@/lib/actions/accounts'
import { formatIDR } from '@/lib/utils/currency'

interface ManualEntryFormProps {
  accounts: Account[]
  categories: Category[]
  prefillFromError?: IngestionError
  onSuccess: () => void
  onClose: () => void
}

const TRANSACTION_TYPES: TransactionType[] = [
  'Income',
  'Expense',
  'CC Spend',
  'Repayment',
  'Savings/Investment',
  'Internal Transfer',
]

const TYPES_REQUIRING_CATEGORY: TransactionType[] = ['Income', 'Expense', 'CC Spend']
const TYPES_WITH_DESTINATION: TransactionType[] = ['Internal Transfer', 'Savings/Investment', 'Repayment']

export function ManualEntryForm({ accounts, categories, prefillFromError, onSuccess, onClose }: ManualEntryFormProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [date, setDate] = useState(today)
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('Expense')
  const [categoryId, setCategoryId] = useState<string>('')
  const [destinationAccountId, setDestinationAccountId] = useState<string>('')
  const [notes, setNotes] = useState(prefillFromError ? prefillFromError?.raw_email?.slice(0, 500) ?? '' : '')
  const [error, setError] = useState<string | null>(null)
  const [usdtRate, setUsdtRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selectedAccount = accounts.find((a) => a.id === accountId)
  const isCrypto = selectedAccount?.type === 'Crypto Wallet'
  const needsCategory = TYPES_REQUIRING_CATEGORY.includes(type)
  const needsDest = TYPES_WITH_DESTINATION.includes(type)

  const filteredCategories = categories.filter((c) => c.applicable_types.includes(type))

  async function handleAccountChange(id: string) {
    setAccountId(id)
    const acc = accounts.find((a) => a.id === id)
    if (acc?.type === 'Crypto Wallet') {
      setRateLoading(true)
      try {
        const rate = await getUsdtRate()
        setUsdtRate(rate)
      } finally {
        setRateLoading(false)
      }
    } else {
      setUsdtRate(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountNum = parseInt(amount, 10)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be a positive integer.')
      return
    }

    startTransition(async () => {
      const result = await createTransaction({
        account_id: accountId,
        date,
        merchant: merchant.trim(),
        amount: amountNum,
        type,
        category_id: needsCategory && categoryId ? categoryId : null,
        destination_account_id: needsDest && destinationAccountId ? destinationAccountId : null,
        source: 'manual',
        notes: notes.trim() || null,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      if (prefillFromError && result.id) {
        await resolveIngestionError(prefillFromError.id, result.id)
      }

      onSuccess()
    })
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  }

  const labelStyle = { color: 'var(--text-secondary)' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-md px-3 py-2 text-sm"
          style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', color: 'var(--red)' }}
        >
          {error}
        </div>
      )}

      {/* Account */}
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Account</label>
        <select
          value={accountId}
          onChange={(e) => handleAccountChange(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={inputStyle}
          required
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={inputStyle}
          required
        />
      </div>

      {/* Merchant */}
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Merchant / Description</label>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={inputStyle}
          required
          placeholder="e.g. Grab Food"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Amount (IDR)</label>
        <input
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={inputStyle}
          required
          placeholder="0"
        />
        {isCrypto && rateLoading && (
          <span className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Fetching rate...</span>
        )}
        {isCrypto && !rateLoading && usdtRate != null && (
          <div
            className="mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border"
            style={{
              background: 'var(--purple-dim)',
              borderColor: 'var(--purple-border)',
              color: 'var(--purple)',
            }}
          >
            1 USDT ≈ {formatIDR(usdtRate)}
          </div>
        )}
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Type</label>
        <select
          value={type}
          onChange={(e) => { setType(e.target.value as TransactionType); setCategoryId('') }}
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={inputStyle}
          required
        >
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Category (only for types that need it) */}
      {needsCategory && (
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="">— None</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Destination Account */}
      {needsDest && (
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Destination Account</label>
          <select
            value={destinationAccountId}
            onChange={(e) => setDestinationAccountId(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="">— Select destination</option>
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md px-3 py-2 text-sm outline-none resize-none"
          style={inputStyle}
          placeholder="Additional notes…"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {isPending ? 'Saving…' : 'Save Transaction'}
        </button>
      </div>
    </form>
  )
}

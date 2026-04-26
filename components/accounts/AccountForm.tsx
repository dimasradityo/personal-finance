'use client'

import { useState, useTransition } from 'react'
import { Account, AccountType } from '@/types'
import { createAccount, updateAccount } from '@/lib/actions/accounts'

interface AccountFormProps {
  account?: Account
  onSuccess: () => void
  onClose: () => void
}

const ACCOUNT_TYPES: AccountType[] = ['Debit', 'Credit Card', 'E-Wallet', 'Crypto Wallet']

export function AccountForm({ account, onSuccess, onClose }: AccountFormProps) {
  const isEdit = !!account

  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'Debit')
  const [balance, setBalance] = useState(String(account?.balance ?? 0))
  const [creditLimit, setCreditLimit] = useState(String(account?.credit_limit ?? ''))
  const [statementDate, setStatementDate] = useState(String(account?.statement_date ?? ''))
  const [paymentDueDate, setPaymentDueDate] = useState(String(account?.payment_due_date ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isCC = type === 'Credit Card'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const balanceNum = parseInt(balance, 10)
    if (isNaN(balanceNum) || balanceNum < 0) {
      setError('Balance must be a non-negative integer.')
      return
    }

    if (isCC && (!creditLimit || isNaN(parseInt(creditLimit, 10)))) {
      setError('Credit limit is required for Credit Card accounts.')
      return
    }

    const formData = {
      name: name.trim(),
      type,
      balance: balanceNum,
      credit_limit: isCC ? parseInt(creditLimit, 10) : null,
      statement_date: isCC && statementDate ? parseInt(statementDate, 10) : null,
      payment_due_date: isCC && paymentDueDate ? parseInt(paymentDueDate, 10) : null,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateAccount(account.id, formData)
        : await createAccount(formData)

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    })
  }

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

      {/* Name */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Name <span style={{ color: 'var(--red)' }}>*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
          placeholder="e.g. BCA Main"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Balance */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Current Balance (IDR)
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
          placeholder="0"
        />
      </div>

      {/* Credit Card fields */}
      {isCC && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Credit Limit (IDR) <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="number"
              min={0}
              step={1}
              required
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              placeholder="e.g. 10000000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Statement Date (1–31)
            </label>
            <input
              type="number"
              min={1}
              max={31}
              step={1}
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              placeholder="e.g. 28"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Payment Due Date (1–31)
            </label>
            <input
              type="number"
              min={1}
              max={31}
              step={1}
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              placeholder="e.g. 15"
            />
          </div>
        </>
      )}

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
          style={{
            background: 'var(--accent)',
            color: '#fff',
          }}
        >
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Account'}
        </button>
      </div>
    </form>
  )
}

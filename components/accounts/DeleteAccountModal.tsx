'use client'

import { useState, useTransition } from 'react'
import { Account } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { deleteAccount } from '@/lib/actions/accounts'

interface DeleteAccountModalProps {
  account: Account
  transactionCount: number
  onConfirm: () => void
  onClose: () => void
}

export function DeleteAccountModal({ account, transactionCount, onConfirm, onClose }: DeleteAccountModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteAccount(account.id)
      if (result.error) {
        setError(result.error)
        return
      }
      onConfirm()
    })
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Delete Account"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: 'var(--red)',
              color: '#fff',
            }}
          >
            {isPending ? 'Deleting…' : 'Delete Account'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          Are you sure you want to delete{' '}
          <span className="font-semibold">{account.name}</span>?
        </p>
        {transactionCount > 0 && (
          <div
            className="rounded-md px-3 py-2 text-sm"
            style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', color: 'var(--amber)' }}
          >
            This account has {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}. The account will be
            hidden but all data will be retained.
          </div>
        )}
        {error && (
          <div
            className="rounded-md px-3 py-2 text-sm"
            style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', color: 'var(--red)' }}
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

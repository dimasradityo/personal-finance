'use client'

import { useState } from 'react'
import { IngestionError, Account, Category } from '@/types'
import { SlideOver } from '@/components/ui/SlideOver'
import { ManualEntryForm } from '@/components/transactions/ManualEntryForm'

interface ErrorPanelProps {
  errors: IngestionError[]
  accounts: Account[]
  categories: Category[]
  onResolved: () => void
}

export function ErrorPanel({ errors, accounts, categories, onResolved }: ErrorPanelProps) {
  const [selectedError, setSelectedError] = useState<IngestionError | null>(null)

  if (errors.length === 0) return null

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--red-border)', background: 'var(--red-dim)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--red-border)' }}
      >
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: 'var(--red)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: 'var(--red)' }}>
          {errors.length} ingestion error{errors.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--red-border)' }}>
        {errors.map((err) => (
          <div key={err.id} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {err.error_reason}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {formatDate(err.created_at)}
              </p>
              {err.raw_email && (
                <p
                  className="text-[11px] mt-1 truncate"
                  style={{ color: 'var(--text-secondary)', maxWidth: 400 }}
                >
                  {err.raw_email.slice(0, 100)}{err.raw_email.length > 100 ? '…' : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedError(err)}
              className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              Add manually
            </button>
          </div>
        ))}
      </div>

      {selectedError && (
        <SlideOver
          open={true}
          onClose={() => setSelectedError(null)}
          title="Add Transaction Manually"
        >
          <ManualEntryForm
            accounts={accounts}
            categories={categories}
            prefillFromError={selectedError}
            onSuccess={() => {
              setSelectedError(null)
              onResolved()
            }}
            onClose={() => setSelectedError(null)}
          />
        </SlideOver>
      )}
    </div>
  )
}

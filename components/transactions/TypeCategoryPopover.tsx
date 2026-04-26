'use client'

import { useState, useRef, useEffect } from 'react'
import { TransactionType, Category } from '@/types'
import { updateTransactionTypeAndCategory } from '@/lib/actions/transactions'

const TRANSACTION_TYPES: TransactionType[] = [
  'Income',
  'Expense',
  'CC Spend',
  'Repayment',
  'Savings/Investment',
  'Internal Transfer',
]

const TYPES_REQUIRING_CATEGORY: TransactionType[] = ['Income', 'Expense', 'CC Spend']

interface TypeCategoryPopoverProps {
  transactionId: string
  currentType: TransactionType
  currentCategoryId: string | null
  categories: Category[]
  mode: 'type' | 'category'
  onClose: () => void
  onUpdated: () => void
}

export function TypeCategoryPopover({
  transactionId,
  currentType,
  currentCategoryId,
  categories,
  mode,
  onClose,
  onUpdated,
}: TypeCategoryPopoverProps) {
  const [step, setStep] = useState<'type' | 'category'>(mode)
  const [selectedType, setSelectedType] = useState<TransactionType>(currentType)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  async function handleTypeSelect(type: TransactionType) {
    setSelectedType(type)
    if (TYPES_REQUIRING_CATEGORY.includes(type)) {
      setStep('category')
    } else {
      setLoading(true)
      await updateTransactionTypeAndCategory(transactionId, type, null)
      setLoading(false)
      onUpdated()
      onClose()
    }
  }

  async function handleCategorySelect(categoryId: string | null) {
    setLoading(true)
    await updateTransactionTypeAndCategory(transactionId, selectedType, categoryId)
    setLoading(false)
    onUpdated()
    onClose()
  }

  const filteredCategories = categories.filter(
    (c) => c.applicable_types.includes(selectedType)
  )

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-md shadow-xl overflow-hidden"
      style={{
        top: '100%',
        left: 0,
        minWidth: 180,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
      }}
    >
      {loading && (
        <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Saving…
        </div>
      )}

      {!loading && step === 'type' && (
        <>
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
            Select type
          </div>
          {TRANSACTION_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => handleTypeSelect(t)}
              className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5"
              style={{ color: t === currentType ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {t}
            </button>
          ))}
        </>
      )}

      {!loading && step === 'category' && (
        <>
          <div
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wide"
            style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => setStep('type')}
              className="hover:text-white"
            >
              ← Type
            </button>
            <span>/ Category</span>
          </div>
          <button
            onClick={() => handleCategorySelect(null)}
            className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
          >
            — No category
          </button>
          {filteredCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCategorySelect(c.id)}
              className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5 flex items-center gap-2"
              style={{ color: c.id === currentCategoryId ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: c.color }}
              />
              {c.name}
            </button>
          ))}
          {filteredCategories.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              No categories for this type.
            </div>
          )}
        </>
      )}
    </div>
  )
}

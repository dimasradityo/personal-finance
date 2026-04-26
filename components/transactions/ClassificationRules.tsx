'use client'

import { useState, useTransition } from 'react'
import { ClassificationRule, Category, TransactionType } from '@/types'
import { SlideOver } from '@/components/ui/SlideOver'
import {
  createClassificationRule,
  updateClassificationRule,
  toggleClassificationRule,
  rerunClassificationRules,
  ClassificationRuleData,
} from '@/lib/actions/transactions'

interface ClassificationRulesProps {
  rules: ClassificationRule[]
  categories: Category[]
  onUpdated: () => void
}

const TRANSACTION_TYPES: TransactionType[] = [
  'Income',
  'Expense',
  'CC Spend',
  'Repayment',
  'Savings/Investment',
  'Internal Transfer',
]

interface RuleFormState {
  keyword: string
  transaction_type: TransactionType
  category_id: string
}

function RuleForm({
  initial,
  categories,
  onSave,
  onClose,
}: {
  initial?: RuleFormState
  categories: Category[]
  onSave: (data: ClassificationRuleData) => Promise<void>
  onClose: () => void
}) {
  const [keyword, setKeyword] = useState(initial?.keyword ?? '')
  const [transactionType, setTransactionType] = useState<TransactionType>(initial?.transaction_type ?? 'Expense')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredCategories = categories.filter((c) => c.applicable_types.includes(transactionType))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!keyword.trim()) {
      setError('Keyword is required.')
      return
    }
    startTransition(async () => {
      await onSave({
        keyword: keyword.trim(),
        transaction_type: transactionType,
        category_id: categoryId || null,
        is_enabled: true,
      })
      onClose()
    })
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
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
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Keyword
        </label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={inputStyle}
          placeholder="e.g. Grab, Shopee"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Type
        </label>
        <select
          value={transactionType}
          onChange={(e) => { setTransactionType(e.target.value as TransactionType); setCategoryId('') }}
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={inputStyle}
        >
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Category (optional)
        </label>
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
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md px-4 py-2 text-sm font-medium"
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
          className="flex-1 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {isPending ? 'Saving…' : 'Save Rule'}
        </button>
      </div>
    </form>
  )
}

export function ClassificationRules({ rules, categories, onUpdated }: ClassificationRulesProps) {
  const [expanded, setExpanded] = useState(false)
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null)
  const [rerunResult, setRerunResult] = useState<string | null>(null)
  const [isRerunning, startRerunTransition] = useTransition()
  const [, startTransition] = useTransition()

  function handleRerun() {
    setRerunResult(null)
    startRerunTransition(async () => {
      const result = await rerunClassificationRules()
      if (result.error) {
        setRerunResult(`Error: ${result.error}`)
      } else {
        setRerunResult(`Updated ${result.updatedCount} transaction${result.updatedCount !== 1 ? 's' : ''}.`)
        onUpdated()
      }
    })
  }

  async function handleSaveNew(data: ClassificationRuleData) {
    startTransition(async () => {
      await createClassificationRule(data)
      onUpdated()
    })
  }

  async function handleSaveEdit(data: ClassificationRuleData) {
    if (!editingRule) return
    startTransition(async () => {
      await updateClassificationRule(editingRule.id, { ...data, is_enabled: editingRule.is_enabled })
      onUpdated()
    })
  }

  function handleToggle(rule: ClassificationRule) {
    startTransition(async () => {
      await toggleClassificationRule(rule.id, !rule.is_enabled)
      onUpdated()
    })
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/3"
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Classification Rules
          {rules.length > 0 && (
            <span
              className="ml-2 rounded-full px-1.5 py-0.5 text-[10px]"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              {rules.length}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          style={{ color: 'var(--text-muted)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Actions row */}
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => { setEditingRule(null); setSlideOverOpen(true) }}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              + Add Rule
            </button>
            <button
              onClick={handleRerun}
              disabled={isRerunning}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              {isRerunning ? 'Running…' : 'Re-run Rules'}
            </button>
            {rerunResult && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{rerunResult}</span>
            )}
          </div>

          {/* Table */}
          {rules.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No rules yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Keyword', 'Type', 'Category', 'Enabled', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2 uppercase tracking-wide font-medium"
                        style={{ color: 'var(--text-muted)', fontSize: 10 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => {
                    const cat = categories.find((c) => c.id === rule.category_id)
                    return (
                      <tr
                        key={rule.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text-primary)' }}>
                          {rule.keyword}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                          {rule.transaction_type}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                          {cat ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                              {cat.name}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => handleToggle(rule)}
                            className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
                            style={{
                              background: rule.is_enabled ? 'var(--green)' : 'var(--border-default)',
                            }}
                            aria-label={rule.is_enabled ? 'Disable' : 'Enable'}
                          >
                            <span
                              className="inline-block h-3 w-3 rounded-full bg-white transition-transform"
                              style={{ transform: rule.is_enabled ? 'translateX(14px)' : 'translateX(2px)' }}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => { setEditingRule(rule); setSlideOverOpen(true) }}
                            className="text-xs transition-colors hover:underline"
                            style={{ color: 'var(--accent)' }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <SlideOver
        open={slideOverOpen}
        onClose={() => { setSlideOverOpen(false); setEditingRule(null) }}
        title={editingRule ? 'Edit Rule' : 'Add Rule'}
      >
        <RuleForm
          initial={editingRule ? {
            keyword: editingRule.keyword,
            transaction_type: editingRule.transaction_type,
            category_id: editingRule.category_id ?? '',
          } : undefined}
          categories={categories}
          onSave={editingRule ? handleSaveEdit : handleSaveNew}
          onClose={() => { setSlideOverOpen(false); setEditingRule(null) }}
        />
      </SlideOver>
    </div>
  )
}

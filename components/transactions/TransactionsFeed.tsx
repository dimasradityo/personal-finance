'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  Account,
  Category,
  TransactionType,
  TransactionWithRelations,
  ClassificationRule,
  IngestionError,
} from '@/types'
import { formatIDR } from '@/lib/utils/currency'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { TypeBadge } from '@/components/ui/TypeBadge'
import { SlideOver } from '@/components/ui/SlideOver'
import { TypeCategoryPopover } from './TypeCategoryPopover'
import { ManualEntryForm } from './ManualEntryForm'
import { ErrorPanel } from './ErrorPanel'
import { ClassificationRules } from './ClassificationRules'
import {
  getTransactions,
  batchUpdateTransactions,
  getUnclassifiedCount,
  TransactionFilters,
} from '@/lib/actions/transactions'

interface TransactionsFeedProps {
  initialTransactions: TransactionWithRelations[]
  initialUnclassifiedCount: number
  accounts: Account[]
  categories: Category[]
  rules: ClassificationRule[]
  ingestionErrors: IngestionError[]
  currentYear: number
  currentMonth: number
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

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface PopoverState {
  txId: string
  type: TransactionType
  categoryId: string | null
  mode: 'type' | 'category'
}

export function TransactionsFeed({
  initialTransactions,
  initialUnclassifiedCount,
  accounts,
  categories,
  rules,
  ingestionErrors,
  currentYear,
  currentMonth,
}: TransactionsFeedProps) {
  const [month, setMonth] = useState({ year: currentYear, month: currentMonth })
  const [allTime, setAllTime] = useState(false)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>(initialTransactions)
  const [unclassifiedCount, setUnclassifiedCount] = useState(initialUnclassifiedCount)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [batchType, setBatchType] = useState<TransactionType | ''>('')
  const [batchCategoryId, setBatchCategoryId] = useState<string>('')
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [manualSlideOverOpen, setManualSlideOverOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [accountDropOpen, setAccountDropOpen] = useState(false)
  const [typeDropOpen, setTypeDropOpen] = useState(false)
  const [catDropOpen, setCatDropOpen] = useState(false)

  const refresh = useCallback((overrides?: {
    accountIds?: string[]
    types?: TransactionType[]
    categoryIds?: string[]
    year?: number
    month?: number
    allTime?: boolean
  }) => {
    startTransition(async () => {
      const resolvedAllTime = overrides?.allTime ?? allTime
      const resolvedYear = overrides?.year ?? month.year
      const resolvedMonth = overrides?.month ?? month.month
      const resolvedAccountIds = overrides?.accountIds ?? selectedAccountIds
      const resolvedTypes = overrides?.types ?? selectedTypes
      const resolvedCategoryIds = overrides?.categoryIds ?? selectedCategoryIds
      const filters: TransactionFilters = {
        year: resolvedAllTime ? undefined : resolvedYear,
        month: resolvedAllTime ? undefined : resolvedMonth,
        allTime: resolvedAllTime,
        accountIds: resolvedAccountIds.length > 0 ? resolvedAccountIds : undefined,
        types: resolvedTypes.length > 0 ? resolvedTypes : undefined,
        categoryIds: resolvedCategoryIds.length > 0 ? resolvedCategoryIds : undefined,
      }
      const [txns, cnt] = await Promise.all([
        getTransactions(filters),
        getUnclassifiedCount(),
      ])
      setTransactions(txns)
      setUnclassifiedCount(cnt)
      setCheckedIds(new Set())
    })
  }, [allTime, month, selectedAccountIds, selectedTypes, selectedCategoryIds])

  function handleMonthChange(v: { year: number; month: number }) {
    setMonth(v)
    setAllTime(false)
    refresh({ year: v.year, month: v.month, allTime: false })
  }

  function toggleAllTime() {
    const next = !allTime
    setAllTime(next)
    refresh({ allTime: next })
  }

  function toggleAccount(id: string) {
    const next = selectedAccountIds.includes(id)
      ? selectedAccountIds.filter((x) => x !== id)
      : [...selectedAccountIds, id]
    setSelectedAccountIds(next)
    refresh({ accountIds: next })
  }

  function toggleType(t: TransactionType) {
    const next = selectedTypes.includes(t)
      ? selectedTypes.filter((x) => x !== t)
      : [...selectedTypes, t]
    setSelectedTypes(next)
    refresh({ types: next })
  }

  function toggleCategory(id: string) {
    const next = selectedCategoryIds.includes(id)
      ? selectedCategoryIds.filter((x) => x !== id)
      : [...selectedCategoryIds, id]
    setSelectedCategoryIds(next)
    refresh({ categoryIds: next })
  }

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (checkedIds.size === transactions.length) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(transactions.map((t) => t.id)))
    }
  }

  function applyBatch() {
    if (checkedIds.size === 0) return
    startTransition(async () => {
      await batchUpdateTransactions(
        Array.from(checkedIds),
        batchType || undefined,
        batchCategoryId || undefined
      )
      setCheckedIds(new Set())
      setBatchType('')
      setBatchCategoryId('')
      refresh()
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky filter bar */}
      <div
        className="sticky top-0 z-30 px-6 py-3 flex flex-wrap items-center gap-2"
        style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <MonthPicker value={month} onChange={handleMonthChange} />

        {/* Account filter */}
        <div className="relative">
          <button
            onClick={() => { setAccountDropOpen(!accountDropOpen); setTypeDropOpen(false); setCatDropOpen(false) }}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: selectedAccountIds.length > 0 ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              border: `1px solid ${selectedAccountIds.length > 0 ? 'var(--accent-border)' : 'var(--border-default)'}`,
              color: selectedAccountIds.length > 0 ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Accounts {selectedAccountIds.length > 0 ? `(${selectedAccountIds.length})` : '▾'}
          </button>
          {accountDropOpen && (
            <div
              className="absolute top-full left-0 mt-1 z-50 rounded-md shadow-lg overflow-hidden"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', minWidth: 160 }}
            >
              {accounts.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-white/5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(a.id)}
                    onChange={() => toggleAccount(a.id)}
                    className="rounded"
                  />
                  {a.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Type filter */}
        <div className="relative">
          <button
            onClick={() => { setTypeDropOpen(!typeDropOpen); setAccountDropOpen(false); setCatDropOpen(false) }}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: selectedTypes.length > 0 ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              border: `1px solid ${selectedTypes.length > 0 ? 'var(--accent-border)' : 'var(--border-default)'}`,
              color: selectedTypes.length > 0 ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Types {selectedTypes.length > 0 ? `(${selectedTypes.length})` : '▾'}
          </button>
          {typeDropOpen && (
            <div
              className="absolute top-full left-0 mt-1 z-50 rounded-md shadow-lg overflow-hidden"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', minWidth: 160 }}
            >
              {TRANSACTION_TYPES.map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-white/5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t)}
                    onChange={() => toggleType(t)}
                    className="rounded"
                  />
                  {t}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Category filter */}
        <div className="relative">
          <button
            onClick={() => { setCatDropOpen(!catDropOpen); setAccountDropOpen(false); setTypeDropOpen(false) }}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: selectedCategoryIds.length > 0 ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              border: `1px solid ${selectedCategoryIds.length > 0 ? 'var(--accent-border)' : 'var(--border-default)'}`,
              color: selectedCategoryIds.length > 0 ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Categories {selectedCategoryIds.length > 0 ? `(${selectedCategoryIds.length})` : '▾'}
          </button>
          {catDropOpen && (
            <div
              className="absolute top-full left-0 mt-1 z-50 rounded-md shadow-lg overflow-hidden"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', minWidth: 160 }}
            >
              {categories.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-white/5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                    className="rounded"
                  />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* All time toggle */}
        <button
          onClick={toggleAllTime}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: allTime ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            border: `1px solid ${allTime ? 'var(--accent-border)' : 'var(--border-default)'}`,
            color: allTime ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          All time
        </button>

        {/* Unclassified chip */}
        {unclassifiedCount > 0 && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', color: 'var(--red)' }}
          >
            • {unclassifiedCount} unclassified
          </span>
        )}

        {isPending && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</span>
        )}

        {/* Add button */}
        <button
          onClick={() => setManualSlideOverOpen(true)}
          className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + Add
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-4 space-y-4">
        {/* Error panel */}
        <ErrorPanel
          errors={ingestionErrors}
          accounts={accounts}
          categories={categories}
          onResolved={refresh}
        />

        {/* Classification rules */}
        <ClassificationRules
          rules={rules}
          categories={categories}
          onUpdated={refresh}
        />

        {/* Transaction table */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={checkedIds.size === transactions.length && transactions.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  {['DATE', 'MERCHANT', 'ACCOUNT', 'TYPE', 'CATEGORY', 'AMOUNT'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-[11px] uppercase tracking-wide font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No transactions found.
                    </td>
                  </tr>
                )}
                {transactions.map((tx) => {
                  const cat = tx.category
                  const isIncome = tx.type === 'Income'
                  const needsCat = tx.type != null && TYPES_REQUIRING_CATEGORY.includes(tx.type)
                  const missingCat = needsCat && !tx.category_id

                  return (
                    <tr
                      key={tx.id}
                      className="transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: checkedIds.has(tx.id) ? 'var(--accent-dim)' : undefined,
                        opacity: tx.installment_converted ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!checkedIds.has(tx.id))
                          (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-elevated)'
                      }}
                      onMouseLeave={(e) => {
                        if (!checkedIds.has(tx.id))
                          (e.currentTarget as HTMLTableRowElement).style.background = ''
                      }}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={checkedIds.has(tx.id)}
                          onChange={() => toggleCheck(tx.id)}
                          className="rounded"
                        />
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatShortDate(tx.date)}
                        </span>
                      </td>

                      {/* Merchant */}
                      <td className="px-3 py-3 max-w-[200px]">
                        <p
                          className="text-[13px] font-semibold truncate"
                          style={{ color: tx.installment_converted ? 'var(--text-muted)' : 'var(--text-primary)' }}
                        >
                          {tx.merchant}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {tx.source === 'manual' && <TypeBadge type="manual" />}
                          {tx.installment_converted && <TypeBadge type="converted" />}
                          {missingCat && <TypeBadge type="unclassified" />}
                        </div>
                      </td>

                      {/* Account */}
                      <td className="px-3 py-3">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {tx.account?.name ?? '—'}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setPopover(
                                popover?.txId === tx.id && popover.mode === 'type'
                                  ? null
                                  : { txId: tx.id, type: tx.type, categoryId: tx.category_id, mode: 'type' }
                              )
                            }
                          >
                            <TypeBadge type={tx.type} />
                          </button>
                          {popover?.txId === tx.id && popover.mode === 'type' && (
                            <TypeCategoryPopover
                              transactionId={tx.id}
                              currentType={popover.type}
                              currentCategoryId={popover.categoryId}
                              categories={categories}
                              mode="type"
                              onClose={() => setPopover(null)}
                              onUpdated={refresh}
                            />
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3">
                        <div className="relative inline-block">
                          {needsCat ? (
                            <button
                              onClick={() =>
                                setPopover(
                                  popover?.txId === tx.id && popover.mode === 'category'
                                    ? null
                                    : { txId: tx.id, type: tx.type, categoryId: tx.category_id, mode: 'category' }
                                )
                              }
                              className="flex items-center gap-1"
                            >
                              {cat ? (
                                <span
                                  className="rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1.5"
                                  style={{
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-default)',
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: cat.color }}
                                  />
                                  {cat.name}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {missingCat && <span style={{ color: 'var(--amber)' }}>⚠</span>}
                                  —
                                </span>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                          {popover?.txId === tx.id && popover.mode === 'category' && (
                            <TypeCategoryPopover
                              transactionId={tx.id}
                              currentType={popover.type}
                              currentCategoryId={popover.categoryId}
                              categories={categories}
                              mode="category"
                              onClose={() => setPopover(null)}
                              onUpdated={refresh}
                            />
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-3 text-right">
                        <span
                          className="font-mono text-sm font-medium"
                          style={{ color: isIncome ? 'var(--green)' : 'var(--text-primary)' }}
                        >
                          {isIncome ? '+' : '−'}{formatIDR(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Batch action bar */}
      {checkedIds.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 md:left-60 z-40 flex items-center gap-3 px-6 py-3"
          style={{
            background: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {checkedIds.size} selected —
          </span>
          <select
            value={batchType}
            onChange={(e) => setBatchType(e.target.value as TransactionType | '')}
            className="rounded-md px-2 py-1.5 text-xs outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">Assign type…</option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={batchCategoryId}
            onChange={(e) => setBatchCategoryId(e.target.value)}
            className="rounded-md px-2 py-1.5 text-xs outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">Assign category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {(batchType || batchCategoryId) && (
            <button
              onClick={applyBatch}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Apply
            </button>
          )}
          <button
            onClick={() => { setCheckedIds(new Set()); setBatchType(''); setBatchCategoryId('') }}
            className="rounded-md px-3 py-1.5 text-xs font-medium ml-auto"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Manual entry slide-over */}
      <SlideOver
        open={manualSlideOverOpen}
        onClose={() => setManualSlideOverOpen(false)}
        title="Add Transaction"
      >
        <ManualEntryForm
          accounts={accounts}
          categories={categories}
          onSuccess={() => {
            setManualSlideOverOpen(false)
            refresh()
          }}
          onClose={() => setManualSlideOverOpen(false)}
        />
      </SlideOver>

      {/* FAB */}
      <button
        onClick={() => setManualSlideOverOpen(true)}
        className="fixed bottom-6 right-6 z-30 md:hidden flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-colors"
        style={{ background: 'var(--accent)', color: '#fff' }}
        aria-label="Add transaction"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import {
  createCategory,
  updateCategory,
  archiveCategory,
  getAllCategories,
} from '@/lib/actions/categories'
import type { Category, TransactionType } from '@/types'

const PRESET_COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#a855f7', '#f97316', '#ec4899', '#06b6d4']
const TYPE_LABELS: Record<string, string> = {
  Income: 'Income',
  Expense: 'Expense',
  'CC Spend': 'CC Spend',
}
const TYPE_GROUPS: TransactionType[] = ['Income', 'Expense', 'CC Spend']

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 12px',
  background: 'var(--bg-surface)', color: 'var(--text-primary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
  fontSize: 13, outline: 'none', fontFamily: 'inherit',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{label}</label>
      {children}
    </div>
  )
}

function CategoryChip({ cat }: { cat: Category }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: 12, fontWeight: 500 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }} />
      {cat.name}
    </div>
  )
}

// ── Archive Confirm Modal ─────────────────────────────────────────────────────
function ArchiveModal({ cat, onConfirm, onCancel }: { cat: Category; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', width: 420, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Archive &quot;{cat.name}&quot;?</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Existing transactions using this category will be unaffected. The category will no longer appear in transaction dropdowns.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--red-border)', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Archive</button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Category Modal ───────────────────────────────────────────────────────
function EditCategoryModal({ cat, onSave, onCancel }: { cat: Category; onSave: (name: string, color: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(cat.name)
  const [color, setColor] = useState(cat.color)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', width: 420, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Edit Category</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          <Field label="Name">
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Color">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: c, border: color === c ? '2px solid var(--text-primary)' : '1px solid var(--border-default)', cursor: 'pointer', transition: 'all 0.1s' }} />
              ))}
            </div>
          </Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onSave(name, color)} style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Add Category Form ─────────────────────────────────────────────────────────
function AddCategoryForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [types, setTypes] = useState<TransactionType[]>(['Expense'])
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleType(t: TransactionType) {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function handleSave() {
    if (!name.trim()) return setError('Name is required')
    if (types.length === 0) return setError('Select at least one type')
    startTransition(async () => {
      const res = await createCategory({ name, applicable_types: types, color })
      if (res.error) { setError(res.error) } else { onSaved() }
    })
  }

  return (
    <div style={{ padding: 16, marginTop: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Field label="Name">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name" style={inputStyle} />
        </Field>
        <Field label="Applicable to">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TYPE_GROUPS.map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} />
                {TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Color">
        <div style={{ display: 'flex', gap: 8 }}>
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: c, border: color === c ? '2px solid var(--text-primary)' : '1px solid var(--border-default)', cursor: 'pointer', transition: 'all 0.1s' }} />
          ))}
        </div>
      </Field>
      {error && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onCancel} style={{ padding: '5px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={isPending} style={{ padding: '5px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Category Group ─────────────────────────────────────────────────────────────
function CategoryGroup({
  label, categories, onUpdated,
}: {
  label: string
  categories: Category[]
  onUpdated: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [archiving, setArchiving] = useState<Category | null>(null)
  const [editing, setEditing] = useState<Category | null>(null)
  const [, startTransition] = useTransition()

  function handleArchive(cat: Category) {
    startTransition(async () => {
      await archiveCategory(cat.id)
      setArchiving(null)
      onUpdated()
    })
  }

  function handleEdit(cat: Category, name: string, color: string) {
    startTransition(async () => {
      await updateCategory(cat.id, { name, color })
      setEditing(null)
      onUpdated()
    })
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        {categories.map(cat => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CategoryChip cat={cat} />
            <button onClick={() => setEditing(cat)} style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', border: 'none', background: 'none', padding: '0 2px' }}>Edit</button>
            <button onClick={() => setArchiving(cat)} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'none', padding: '0 2px' }}>Archive</button>
          </div>
        ))}
        {categories.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No categories</span>}
      </div>

      {adding ? (
        <AddCategoryForm onSaved={() => { setAdding(false); onUpdated() }} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}>+ Add Category</button>
      )}

      {archiving && (
        <ArchiveModal cat={archiving} onConfirm={() => handleArchive(archiving)} onCancel={() => setArchiving(null)} />
      )}
      {editing && (
        <EditCategoryModal cat={editing} onSave={(n, c) => handleEdit(editing, n, c)} onCancel={() => setEditing(null)} />
      )}
    </div>
  )
}

// ── Export Section ────────────────────────────────────────────────────────────
function ExportSection() {
  const [exportScope, setExportScope] = useState<'all' | 'current'>('all')
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const url = exportScope === 'all' ? '/api/export/transactions' : '/api/export/transactions?scope=current'
      const res = await fetch(url)
      const blob = await res.blob()
      const today = new Date().toISOString().slice(0, 10)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `transactions_${today}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Export</h2>
      <div style={{ padding: 20, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Export Transactions</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Download all transactions as a CSV file for use in Excel or other tools.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {([['all', 'All transactions'], ['current', 'Current month']] as const).map(([val, label]) => (
            <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="radio" name="export" checked={exportScope === val} onChange={() => setExportScope(val)} style={{ cursor: 'pointer' }} />
              {label}
            </label>
          ))}
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: isExporting ? 0.7 : 1 }}
        >
          {isExporting ? 'Exporting…' : 'Download CSV'}
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          Columns: date, account, merchant, amount, transaction_type, category, installment_converted, source, notes
        </div>
      </div>
    </div>
  )
}

// ── Main Settings Client ──────────────────────────────────────────────────────
interface SettingsClientProps {
  initialCategories: Category[]
}

export function SettingsClient({ initialCategories }: SettingsClientProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [, startTransition] = useTransition()

  function refresh() {
    startTransition(async () => {
      const cats = await getAllCategories()
      setCategories(cats)
    })
  }

  const byType = (type: TransactionType) =>
    categories.filter(c => c.applicable_types.includes(type))

  return (
    <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Category Management */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Category Management</h2>
<CategoryGroup label="Income" categories={byType('Income')} onUpdated={refresh} />
        <CategoryGroup label="Expense" categories={byType('Expense')} onUpdated={refresh} />
        <CategoryGroup label="CC Spend" categories={byType('CC Spend')} onUpdated={refresh} />
      </div>

      {/* CSV Export */}
      <ExportSection />
    </div>
  )
}

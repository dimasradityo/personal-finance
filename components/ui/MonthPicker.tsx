'use client'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface MonthPickerProps {
  value: { year: number; month: number } // month is 1-based
  onChange: (v: { year: number; month: number }) => void
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const { year, month } = value

  function prev() {
    if (month === 1) {
      onChange({ year: year - 1, month: 12 })
    } else {
      onChange({ year, month: month - 1 })
    }
  }

  function next() {
    if (month === 12) {
      onChange({ year: year + 1, month: 1 })
    } else {
      onChange({ year, month: month + 1 })
    }
  }

  return (
    <div
      className="inline-flex items-center rounded-full border overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border-default)',
        color: 'var(--text-primary)',
      }}
    >
      <button
        onClick={prev}
        className="px-3 py-1.5 text-sm transition-colors hover:bg-white/5"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Previous month"
      >
        ←
      </button>
      <span className="px-3 py-1.5 text-sm font-medium select-none" style={{ color: 'var(--text-primary)' }}>
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        onClick={next}
        className="px-3 py-1.5 text-sm transition-colors hover:bg-white/5"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Next month"
      >
        →
      </button>
    </div>
  )
}

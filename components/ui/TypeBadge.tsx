import { TransactionType } from '@/types'

type BadgeType = TransactionType | 'manual' | 'converted' | 'unclassified'

interface TypeBadgeProps {
  type: BadgeType
}

const colorMap: Record<BadgeType, { bg: string; border: string; color: string; label?: string }> = {
  Income: {
    bg: 'var(--green-dim)',
    border: 'var(--green-border)',
    color: 'var(--green)',
  },
  'CC Spend': {
    bg: 'var(--accent-dim)',
    border: 'var(--accent-border)',
    color: 'var(--accent)',
  },
  Expense: {
    bg: 'var(--red-dim)',
    border: 'var(--red-border)',
    color: 'var(--red)',
  },
  Repayment: {
    bg: 'var(--orange-dim)',
    border: 'var(--orange-border)',
    color: 'var(--orange)',
  },
  'Savings/Investment': {
    bg: 'var(--purple-dim)',
    border: 'var(--purple-border)',
    color: 'var(--purple)',
  },
  'Internal Transfer': {
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.18)',
    color: 'var(--text-muted)',
  },
  manual: {
    bg: 'var(--amber-dim)',
    border: 'var(--amber-border)',
    color: 'var(--amber)',
  },
  converted: {
    bg: 'var(--purple-dim)',
    border: 'var(--purple-border)',
    color: 'var(--purple)',
    label: 'Converted to Installment',
  },
  unclassified: {
    bg: 'var(--red-dim)',
    border: 'var(--red-border)',
    color: 'var(--red)',
    label: 'Unclassified',
  },
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const colors = colorMap[type]
  const label = colors.label ?? type

  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold border"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        color: colors.color,
      }}
    >
      {label}
    </span>
  )
}

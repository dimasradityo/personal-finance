'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { ReactNode } from 'react'

interface NavLinkProps {
  href: string
  icon: ReactNode
  label: string
  badge?: number
}

export function NavLink({ href, icon, label, badge }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
      )}
    >
      <span
        className={cn(
          'h-5 w-5 shrink-0',
          isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
        )}
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

// Bottom tab bar variant for mobile
export function TabLink({ href, icon, label, badge }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
        isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
      )}
    >
      <span className="h-6 w-6 shrink-0">{icon}</span>
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute right-2 top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

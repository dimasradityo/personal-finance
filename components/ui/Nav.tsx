import { createClient } from '@/lib/supabase/server'
import { NavLink, TabLink } from './NavLink'

// ─── Icons (inline SVG to avoid an icon lib dependency) ───────────────────────

function IconAccounts() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
      />
    </svg>
  )
}

function IconTransactions() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
      />
    </svg>
  )
}

function IconPL() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  )
}

function IconInstallments() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

// ─── Nav data ─────────────────────────────────────────────────────────────────

async function getUnresolvedErrorCount(): Promise<number> {
  try {
    const supabase = createClient()
    const { count } = await supabase
      .from('ingestion_errors')
      .select('*', { count: 'exact', head: true })
      .eq('is_resolved', false)
    return count ?? 0
  } catch {
    return 0
  }
}

async function getUnclassifiedCount(): Promise<number> {
  try {
    const supabase = createClient()
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .in('type', ['Income', 'Expense', 'CC Spend'])
      .is('category_id', null)
    return count ?? 0
  } catch {
    return 0
  }
}

// ─── Server component ─────────────────────────────────────────────────────────

export async function Nav() {
  const errorCount = await getUnresolvedErrorCount()
  const unclassifiedCount = await getUnclassifiedCount()

  const links = [
    { href: '/accounts', icon: <IconAccounts />, label: 'Accounts' },
    { href: '/transactions', icon: <IconTransactions />, label: 'Transactions', badge: unclassifiedCount },
    { href: '/pl', icon: <IconPL />, label: 'P&L' },
    { href: '/installments', icon: <IconInstallments />, label: 'Installments' },
    { href: '/settings', icon: <IconSettings />, label: 'Settings', badge: errorCount },
  ]

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:border-r bg-[var(--bg-surface)] border-[var(--border-subtle)]">
        <div className="flex h-16 shrink-0 items-center px-4 border-b border-[var(--border-subtle)]">
          <span className="text-lg font-bold tracking-tight text-[var(--accent)]">FinanceOS</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex border-t bg-[var(--bg-surface)] border-[var(--border-subtle)]">
        {links.map((link) => (
          <TabLink key={link.href} {...link} />
        ))}
      </nav>
    </>
  )
}

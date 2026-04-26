import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/ui/Nav'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'FinanceOS',
  description: 'Personal finance dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans antialiased">
        <Nav />
        {/* Offset for sidebar on desktop, bottom bar on mobile */}
        <div className="md:pl-60 pb-16 md:pb-0">
          <main className="min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  )
}

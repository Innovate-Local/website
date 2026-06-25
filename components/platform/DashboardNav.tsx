'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from '@/lib/platform/roles'

// Sidebar nav with active-link highlighting. Active = exact match, or the
// nearest parent for nested routes (so /dashboard/profile/edit keeps Profile lit
// without /dashboard also matching).
export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="flex flex-row lg:flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`font-label text-sm uppercase tracking-wide px-3 py-2 transition-colors ${
              active
                ? 'bg-surface-container-high text-on-surface font-semibold'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

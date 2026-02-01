'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  PackageSearch,
  Users,
  FileText,
  Receipt,
  History,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/catalogue', label: 'Catalogue', icon: PackageSearch },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/quotes', label: 'Devis', icon: FileText },
  { href: '/invoices', label: 'Factures', icon: Receipt },
  { href: '/history', label: 'Historique', icon: History },
  { href: '/settings', label: 'Parametres', icon: Settings },
];

export function Sidebar({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const pathname = usePathname();
  const wrapperClass =
    variant === 'mobile'
      ? 'flex h-full w-full flex-col border-r bg-white/90 px-6 py-8'
      : 'hidden w-64 flex-col border-r bg-white/70 px-6 py-8 backdrop-blur lg:flex';

  return (
    <aside className={wrapperClass}>
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Zap className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-xl font-semibold">HG ELEC</p>
          <p className="text-xs text-muted-foreground">SaaS electricite</p>
        </div>
      </Link>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <Link
          href="/logout"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </Link>
      </div>
    </aside>
  );
}


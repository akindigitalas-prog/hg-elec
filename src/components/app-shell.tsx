'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

const authRoutes = ['/login', '/register', '/reset-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = authRoutes.some((route) => pathname?.startsWith(route));

  if (isAuth) {
    return (
      <div className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-xl">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-6 pb-16 pt-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}


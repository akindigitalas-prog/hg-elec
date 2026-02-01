import type { Metadata } from 'next';
import { Manrope, Sora } from 'next/font/google';

import './globals.css';
import { AppShell } from '@/components/app-shell';

const fontSans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontDisplay = Sora({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'HG ELEC - Devis & Facturation',
  description: 'SaaS electricite pour devis, factures et catalogue.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${fontSans.variable} ${fontDisplay.variable} font-sans`}>
        <div className="app-shell">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}


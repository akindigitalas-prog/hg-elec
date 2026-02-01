'use client';

import Link from 'next/link';
import { Menu, Zap } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <Sidebar variant="mobile" />
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </span>
        <span className="font-display">HG ELEC</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <span className="text-xs font-semibold">ME</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">Parametres</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/logout">Deconnexion</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}


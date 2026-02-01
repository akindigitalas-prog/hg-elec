'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

export function MenuActionItem({
  action,
  args,
  children,
  className,
  confirmMessage,
}: {
  action: (...args: any[]) => Promise<any>;
  args?: any[];
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  return (
    <DropdownMenuItem
      className={className}
      disabled={isPending}
      onSelect={(event) => {
        event.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        startTransition(async () => {
          try {
            const result = await action(...(args ?? []));
            if (result && typeof result === 'object' && 'error' in result) {
              throw new Error((result as { error?: string }).error || 'Action impossible.');
            }
            router.refresh();
          } catch (error) {
            console.error(error);
            window.alert('Action impossible. Verifiez vos droits et reessayez.');
          }
        });
      }}
    >
      {children}
    </DropdownMenuItem>
  );
}

import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  trend,
  highlight,
}: {
  label: string;
  value: string;
  trend?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border bg-card px-5 py-4 shadow-soft',
        highlight && 'border-primary/30'
      )}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {trend ? <p className="mt-1 text-xs text-muted-foreground">{trend}</p> : null}
    </div>
  );
}

export function SectionCard({
  title,
  children,
  action,
  id,
  className,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn('rounded-3xl border bg-card p-6 shadow-soft', className)}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}


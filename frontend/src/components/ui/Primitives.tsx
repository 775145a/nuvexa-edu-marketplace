import * as React from 'react';
import { cn } from '@/lib/utils';

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />;
}

export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-[3px]' : 'h-6 w-6 border-2';
  return <div className={cn(s, 'animate-spin rounded-full border-primary/30 border-t-primary', className)} />;
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh]">
      <Spinner size="lg" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

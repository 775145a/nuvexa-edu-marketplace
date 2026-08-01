import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  accent?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'crimson' | 'navy';
  loading?: boolean;
  onClick?: () => void;
}

const accentMap: Record<string, string> = {
  primary: 'from-navy-900 to-primary-700',
  secondary: 'gradient-purple',
  accent: 'gradient-cyan',
  success: 'gradient-emerald',
  warning: 'gradient-amber',
  crimson: 'gradient-crimson',
  navy: 'from-navy-950 to-navy-800',
};

const accentText: Record<string, string> = {
  primary: 'bg-navy-900/10 text-navy-900 dark:text-white',
  secondary: 'bg-secondary/10 text-secondary',
  accent: 'bg-accent/10 text-accent-700 dark:text-accent-400',
  success: 'bg-success/10 text-success-700 dark:text-success-400',
  warning: 'bg-warning/10 text-warning-700 dark:text-warning-400',
  crimson: 'bg-crimson/10 text-crimson',
  navy: 'bg-navy-100 text-navy-900 dark:bg-navy-900 dark:text-white',
};

export function StatCard({ label, value, icon, trend, trendLabel, accent = 'primary', loading, onClick }: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'relative overflow-hidden p-5 transition-all duration-300',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-glow',
        'group'
      )}
    >
      <div className={cn('absolute -top-10 -end-10 h-28 w-28 rounded-full opacity-[0.06] bg-gradient-to-br', accentMap[accent])} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground truncate">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-20 skeleton" />
          ) : (
            <p className="mt-1.5 font-display text-[26px] font-bold leading-none tracking-tight">{value}</p>
          )}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
                trend >= 0 ? 'bg-success/10 text-success-700 dark:text-success-400' : 'bg-crimson/10 text-crimson'
              )}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
              {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accentText[accent])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 text-foreground/60">
          {icon}
        </div>
      )}
      <h3 className="font-display text-base font-bold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const statusStyles: Record<string, { label: string; variant: any; dot: string }> = {
  DRAFT: { label: 'Draft', variant: 'outline', dot: 'bg-muted-foreground' },
  PENDING_REVIEW: { label: 'Pending Review', variant: 'warning', dot: 'bg-warning-500' },
  APPROVED: { label: 'Approved', variant: 'success', dot: 'bg-success-500' },
  REJECTED: { label: 'Rejected', variant: 'destructive', dot: 'bg-crimson' },
  PUBLISHED: { label: 'Published', variant: 'success', dot: 'bg-success-500' },
  COMPLETED: { label: 'Completed', variant: 'success', dot: 'bg-success-500' },
  PENDING: { label: 'Pending', variant: 'warning', dot: 'bg-warning-500' },
  FAILED: { label: 'Failed', variant: 'destructive', dot: 'bg-crimson' },
  ACTIVE: { label: 'Active', variant: 'success', dot: 'bg-success-500' },
  STUDENT: { label: 'Student', variant: 'accent', dot: 'bg-accent-500' },
  INSTRUCTOR: { label: 'Instructor', variant: 'secondary', dot: 'bg-secondary' },
  ADMIN: { label: 'Admin', variant: 'navy', dot: 'bg-navy-900' },
  true: { label: 'Yes', variant: 'success', dot: 'bg-success-500' },
  false: { label: 'No', variant: 'outline', dot: 'bg-muted-foreground' },
};

export function StatusBadge({ status, className }: { status: string | boolean; className?: string }) {
  const s = statusStyles[String(status)] || {
    label: String(status).replace(/_/g, ' '),
    variant: 'outline' as any,
    dot: 'bg-muted-foreground',
  };
  return (
    <Badge variant={s.variant} className={cn('gap-1.5', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </Badge>
  );
}

export function ProgressBar({ value, className, barClassName, gradient }: {
  value: number; className?: string; barClassName?: string; gradient?: string;
}) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', gradient || 'bg-gradient-to-r from-secondary to-accent', barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = ({ variant = 'default' }: { variant?: string } = {}) =>
  cn(
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    {
      default: 'bg-muted text-muted-foreground',
      primary: 'bg-primary/10 text-primary',
      secondary: 'bg-secondary/10 text-secondary',
      accent: 'bg-accent/10 text-accent-700 dark:text-accent-400',
      success: 'bg-success/10 text-success-700 dark:text-success-400',
      warning: 'bg-warning/10 text-warning-700 dark:text-warning-400',
      destructive: 'bg-crimson/10 text-crimson',
      outline: 'border border-border text-foreground',
      navy: 'bg-navy-900 text-white',
      white: 'bg-white text-navy-900 border border-border',
    }[variant]
  );

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'destructive' | 'outline' | 'navy' | 'white';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };

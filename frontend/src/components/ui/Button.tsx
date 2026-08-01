import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-card',
        gradient: 'gradient-purple text-white shadow-glow hover:opacity-95 hover:shadow-card',
        cyan: 'gradient-cyan text-white shadow-glowCyan hover:opacity-95',
        emerald: 'gradient-emerald text-white shadow-soft hover:opacity-95',
        outline: 'border border-border bg-transparent hover:bg-muted/60 hover:border-foreground/20',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        ghost: 'hover:bg-muted/70 text-foreground',
        destructive: 'bg-crimson text-white hover:bg-crimson/90 shadow-soft',
        dangerOutline: 'border border-crimson/30 text-crimson hover:bg-crimson/5',
        link: 'text-primary underline-offset-4 hover:underline',
        white: 'bg-white text-navy-900 hover:bg-white/90 shadow-card',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'h-10 w-10',
        iconSm: 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };

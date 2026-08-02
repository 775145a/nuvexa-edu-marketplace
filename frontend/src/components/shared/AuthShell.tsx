'use client';

import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: string;
}

export function AuthShell({ children, title, subtitle, maxWidth = 'max-w-md' }: AuthShellProps) {
  return (
    <div className="gradient-hero relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -top-24 left-1/3 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[8%] top-1/4 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" aria-hidden="true" />

      <div className={cn('relative w-full', maxWidth)}>
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="inline-flex transition-transform duration-300 hover:scale-105" aria-label="Nuvexa">
            <Logo size={56} onDark />
          </Link>
          {title && <h1 className="mt-6 font-display text-2xl font-extrabold text-white md:text-3xl">{title}</h1>}
          {subtitle && <p className="mt-2 text-sm text-white/70">{subtitle}</p>}
        </div>

        <div className="glass-card animate-fade-up rounded-2xl p-6 shadow-2xl md:p-8">{children}</div>

        <p className="mt-6 text-center">
          <Link href="/" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 15 3 9l6-6" />
                <path d="M21 9H3" />
              </svg>
              Nuvexa
            </span>
          </Link>
        </p>
      </div>
    </div>
  );
}

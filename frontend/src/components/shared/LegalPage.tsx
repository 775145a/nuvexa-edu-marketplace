'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { legal } from '@/lib/legal';
import { cn } from '@/lib/utils';

export function LegalPage({ type }: { type: 'terms' | 'privacy' }) {
  const { t, locale } = useI18n();
  const doc = legal[locale][type];

  const tabs: { id: 'terms' | 'privacy'; label: string; href: string }[] = [
    { id: 'terms', label: t.legal.termsTab, href: '/terms' },
    { id: 'privacy', label: t.legal.privacyTab, href: '/privacy' },
  ];

  return (
    <div className="container max-w-4xl pb-16 pt-10 md:pb-24 md:pt-16">
      <div className="mb-8 flex gap-2">
        {tabs.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold transition-all',
              type === item.id
                ? 'bg-primary text-primary-foreground shadow-soft'
                : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <article className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <header className="gradient-purple relative px-6 py-10 text-white md:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            {t.legal.updatedLabel} {doc.updated.replace(/^(آخر تحديث: |Last updated: )/, '')}
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold leading-snug md:text-3xl">{doc.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">{doc.intro}</p>
        </header>

        <div className="px-6 py-8 md:px-10 md:py-10">
          <ol className="space-y-5">
            {doc.sections.map((section, i) => (
              <li key={i} className="flex gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 md:p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {section.heading}
                </span>
                <div className="space-y-2 text-sm leading-relaxed text-muted-foreground md:text-[0.925rem]">
                  {section.content.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-primary transition-colors hover:underline"
            >
              {t.legal.backHome}
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

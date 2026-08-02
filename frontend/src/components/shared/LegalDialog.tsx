'use client';

import * as React from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { legal } from '@/lib/legal';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { cn } from '@/lib/utils';

export type LegalTab = 'terms' | 'privacy';

export function LegalDialog({
  open,
  onOpenChange,
  initialTab = 'terms',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: LegalTab;
}) {
  const { t, locale } = useI18n();
  const [tab, setTab] = React.useState<LegalTab>(initialTab);

  React.useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const doc = legal[locale][tab];

  const tabs: { id: LegalTab; label: string }[] = [
    { id: 'terms', label: t.legal.termsTab },
    { id: 'privacy', label: t.legal.privacyTab },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col gap-0">
        <DialogHeader>
          <DialogTitle>{tab === 'terms' ? t.auth.termsLink : t.auth.privacyLink}</DialogTitle>
          <DialogDescription>
            {t.legal.updatedLabel} {doc.updated.replace(/^(آخر تحديث: |Last updated: )/, '')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex gap-2">
          {tabs.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                tab === item.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-y-auto pe-2 text-sm leading-relaxed text-muted-foreground" style={{ maxHeight: '60vh' }}>
          <p className="mb-4 font-medium text-foreground">{doc.intro}</p>
          <ol className="space-y-4">
            {doc.sections.map((section, i) => (
              <li key={i}>
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {section.heading}
                  </span>
                  <div className="space-y-1.5">
                    {section.content.map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 border-t border-border/60 pt-4 text-center">
          <Link
            href={tab === 'terms' ? '/terms' : '/privacy'}
            className="text-sm font-semibold text-primary transition-colors hover:underline"
            onClick={() => onOpenChange(false)}
          >
            {tab === 'terms' ? t.legal.viewFullTerms : t.legal.viewFullPrivacy}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

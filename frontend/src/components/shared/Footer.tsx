'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { Logo } from '@/components/shared/Logo';
import { WHATSAPP_LINK, SUPPORT_PHONE_INTL } from '@/lib/api';

export function Footer() {
  const { t, locale } = useI18n();

  const exploreLinks = [
    { href: '/courses', label: t.footer.courses },
    { href: '/courses', label: t.footer.instructors },
    { href: '/courses', label: t.footer.categories },
  ];

  const platformLinks = [
    { href: '/', label: t.footer.about },
    { href: '/', label: t.footer.contact },
    { href: '/privacy', label: t.footer.privacy },
    { href: '/terms', label: t.footer.terms },
  ];

  const supportLinks = [
    { href: WHATSAPP_LINK(''), label: t.footer.whatsapp },
    { href: 'mailto:almisriualqaysar@gmail.com', label: t.footer.email },
  ];

  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-border bg-background">
      <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex transition-opacity hover:opacity-90">
            <Logo size={40} />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{t.footer.tagline}</p>
          <div className="mt-5 flex items-center gap-2">
            <a
              href={WHATSAPP_LINK('')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:text-primary"
              aria-label={t.footer.whatsapp}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.83 14.12c-.25.7-1.45 1.33-2.02 1.42-.54.08-1.22.11-1.97-.12-.46-.15-1.05-.34-1.81-.67-3.18-1.37-5.26-4.57-5.42-4.78-.16-.21-1.29-1.72-1.29-3.28 0-1.56.82-2.33 1.11-2.65.29-.32.63-.4.84-.4h.6c.19 0 .45-.03.7.54.25.57.86 1.97.94 2.12.08.15.13.32.03.51-.1.2-.15.32-.3.5-.15.18-.32.4-.45.54-.15.15-.31.32-.13.62.18.31.79 1.3 1.69 2.11 1.16 1.04 2.14 1.37 2.44 1.52.3.15.48.13.66-.08.18-.2.76-.88.96-1.19.2-.31.4-.26.67-.15.28.1 1.75.83 2.05.98.3.15.5.22.58.35.07.13.07.73-.18 1.44z" />
              </svg>
            </a>
            <a
              href="mailto:almisriualqaysar@gmail.com"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:text-primary"
              aria-label={t.footer.email}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="m2 7 10 6 10-6" />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-foreground">{t.footer.explore}</h4>
          <ul className="mt-4 space-y-2.5">
            {exploreLinks.map(link => (
              <li key={link.label}>
                <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-foreground">{t.footer.company}</h4>
          <ul className="mt-4 space-y-2.5">
            {platformLinks.map(link => (
              <li key={link.label}>
                <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-foreground">{t.footer.support}</h4>
          <ul className="mt-4 space-y-2.5">
            {supportLinks.map(link => (
              <li key={link.label}>
                <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm font-semibold text-muted-foreground" dir="ltr">
            +20 {SUPPORT_PHONE_INTL.slice(2)}
          </p>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {year} Nuvexa. {t.footer.rights}
          </p>
          <p className="text-xs text-muted-foreground/70" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {locale === 'ar' ? 'صُنع بشغف للتعليم' : 'Built with passion for education'}
          </p>
        </div>
      </div>
    </footer>
  );
}

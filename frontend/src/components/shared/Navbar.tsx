'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { Logo } from '@/components/shared/Logo';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { t, locale, toggleLocale } = useI18n();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isLoggedIn && mounted) {
      authApi.me().then(r => setUser(r.data)).catch(() => {});
    }
  }, [isLoggedIn, mounted]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/courses', label: t.nav.courses },
  ];

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    if (user.role === 'INSTRUCTOR') return '/instructor/dashboard';
    return '/student/dashboard';
  };

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-90" aria-label="Nuvexa">
          <Logo size={36} />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200',
                isActive(link.href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
              )}
            >
              {isActive(link.href) && (
                <span className="absolute inset-0 rounded-full bg-primary/[0.08] animate-fade-in" aria-hidden="true" />
              )}
              <span className="relative">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleLocale}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-border hover:bg-accent/70 hover:border-border transition-all duration-200"
          >
            {locale === 'ar' ? 'EN' : 'عربي'}
          </button>

          {isLoggedIn && user ? (
            <div className="hidden sm:flex items-center gap-3">
              <Link href={getDashboardLink()} className="text-sm font-semibold text-primary hover:underline underline-offset-4">
                {t.nav.dashboard}
              </Link>
              <button onClick={handleLogout} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold rounded-full border border-border text-foreground hover:bg-accent/70 hover:border-border transition-all duration-200"
              >
                {t.nav.login}
              </Link>
              <Link href="/register" className="btn-gradient px-4 py-2 text-sm font-semibold rounded-full text-white">
                {t.nav.register}
              </Link>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-accent/70 transition-colors"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <div className="flex w-[18px] flex-col gap-[5px]">
              <span className={cn('h-[2px] w-full rounded-full bg-foreground transition-all duration-300', menuOpen && 'translate-y-[7px] rotate-45')} />
              <span className={cn('h-[2px] w-full rounded-full bg-foreground transition-all duration-300', menuOpen && 'opacity-0')} />
              <span className={cn('h-[2px] w-full rounded-full bg-foreground transition-all duration-300', menuOpen && '-translate-y-[7px] -rotate-45')} />
            </div>
          </button>
        </div>
      </div>

      <div
        className={cn(
          'md:hidden overflow-hidden border-b border-border/50 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-out',
          menuOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="container flex flex-col gap-1 py-4">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                isActive(link.href) ? 'bg-primary/[0.08] text-primary' : 'text-muted-foreground hover:bg-accent/70',
              )}
            >
              {link.label}
            </Link>
          ))}

          {isLoggedIn && user ? (
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <Link href={getDashboardLink()} className="btn-gradient rounded-full px-4 py-2.5 text-center text-sm font-semibold text-white">
                {t.nav.dashboard}
              </Link>
              <button onClick={handleLogout} className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <Link href="/login" className="rounded-full border border-border px-4 py-2.5 text-center text-sm font-semibold">
                {t.nav.login}
              </Link>
              <Link href="/register" className="btn-gradient rounded-full px-4 py-2.5 text-center text-sm font-semibold text-white">
                {t.nav.register}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

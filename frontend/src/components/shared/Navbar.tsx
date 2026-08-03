'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { Logo } from '@/components/shared/Logo';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { t, locale, toggleLocale } = useI18n();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isLoggedIn && mounted) {
      authApi.me().then(r => setUser(r.data)).catch(() => {});
    }
  }, [isLoggedIn, mounted]);

  useEffect(() => {
    setMenuOpen(false);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  const handleLogout = () => {
    authApi.logout({}).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/';
  };

  const isHome = pathname === '/';
  const solid = scrolled || !isHome;

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/courses', label: t.nav.courses },
    { href: '/#categories', label: t.nav.categories },
    { href: '/#instructors', label: t.nav.instructors },
    { href: '/#courses', label: t.home.bestSelling },
    { href: '/#contact', label: t.nav.contact },
  ];

  const handleAnchor = (e: React.MouseEvent, href: string) => {
    const id = href.split('#')[1];
    if (isHome && id) {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      setMenuOpen(false);
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    if (user.role === 'INSTRUCTOR') return '/instructor/dashboard';
    return '/student/dashboard';
  };

  const isActive = (href: string) => {
    const clean = href.split('#')[0];
    return clean ? pathname === clean || (clean !== '/' && pathname.startsWith(clean)) : false;
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full bg-white/75 backdrop-blur-xl transition-all duration-300 dark:bg-background/80',
        solid
          ? 'border-b border-border/60 shadow-[0_4px_24px_-16px_rgba(235,32,39,0.18)]'
          : 'border-b border-border/60',
      )}
    >
      <div className="container flex h-[68px] items-center justify-between gap-4">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-90" aria-label="Nuvexa">
          <Logo size={36} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchor(e, link.href)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200',
                isActive(link.href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleLocale}
            className="px-3 py-1.5 text-xs font-bold rounded-full border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all duration-200"
          >
            {locale === 'ar' ? 'EN' : 'عربي'}
          </button>

          <ThemeToggle />

          {isLoggedIn && (
            <NotificationBell className="hidden sm:block" />
          )}

          {isLoggedIn && user ? (
            <div className="hidden sm:flex items-center gap-3">
              <Link href={getDashboardLink()} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary">
                {t.nav.dashboard}
              </Link>
              <button onClick={handleLogout} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2.5">
              <Link
                href="/login"
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {t.nav.login}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(235,32,39,0.6)] transition-colors hover:bg-secondary"
              >
                {t.nav.register}
              </Link>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(o => !o)}
            className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
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
          'lg:hidden overflow-hidden border-b border-border/60 bg-background transition-all duration-300 ease-out',
          menuOpen ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="container flex flex-col gap-1 py-4">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchor(e, link.href)}
              className={cn(
                'rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                isActive(link.href) ? 'bg-primary/[0.08] text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {link.label}
            </Link>
          ))}

          {isLoggedIn && user ? (
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <Link href={getDashboardLink()} className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
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
              <Link href="/register" className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
                {t.nav.register}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

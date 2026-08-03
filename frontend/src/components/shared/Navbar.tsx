'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useState, useEffect } from 'react';
import { authApi, categoryApi } from '@/lib/api';
import { Wordmark } from '@/components/shared/Logo';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { cn } from '@/lib/utils';
import { Search, ChevronDown } from 'lucide-react';

export function Navbar() {
  const { t, locale, toggleLocale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [catsOpen, setCatsOpen] = useState(false);
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isLoggedIn && mounted) {
      authApi.me().then(r => setUser(r.data)).catch(() => {});
    }
  }, [isLoggedIn, mounted]);

  useEffect(() => {
    categoryApi.list().then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setCatsOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    authApi.logout({}).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/';
  };

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = search.trim();
    if (!q) return;
    setSearchOpen(false);
    setMenuOpen(false);
    router.push(`/courses?search=${encodeURIComponent(q)}`);
  };

  const navLinks = [
    { href: '/courses', label: t.nav.courses },
    { href: '/categories', label: t.nav.categories },
    { href: '/#instructors', label: t.nav.instructors },
  ];

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
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-[64px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center transition-opacity hover:opacity-90" aria-label="Nuvexa">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-200',
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setCatsOpen(true)}
              onMouseLeave={() => setCatsOpen(false)}
            >
              <button
                className={cn(
                  'flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-200',
                  catsOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.nav.categories}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', catsOpen && 'rotate-180')} />
              </button>

              <div
                className={cn(
                  'absolute end-0 top-full pt-2 transition-all duration-150',
                  catsOpen ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 -translate-y-1',
                )}
              >
                <div className="w-56 rounded-2xl border border-border bg-card p-2 shadow-card">
                  {categories.slice(0, 8).map((cat: any) => (
                    <Link
                      key={cat.id}
                      href={`/courses?category=${cat.id}`}
                      onClick={() => setCatsOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <span className="truncate">{locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}</span>
                      {cat._count?.courses > 0 && <span className="text-xs text-muted-foreground/70">{cat._count.courses}</span>}
                    </Link>
                  ))}
                  {categories.length > 8 && (
                    <Link
                      href="/categories"
                      onClick={() => setCatsOpen(false)}
                      className="mt-1 block rounded-xl bg-muted px-3 py-2 text-center text-sm font-semibold text-primary"
                    >
                      {t.home.viewAll}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <form onSubmit={submitSearch} className="hidden h-10 items-center gap-2 rounded-full border border-border bg-card px-4 md:flex">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.home.searchPlaceholder}
                autoFocus
                className="h-full w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground lg:w-56"
              />
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary md:flex"
              aria-label={t.home.searchTitle}
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          <ThemeToggle />

          <button
            onClick={toggleLocale}
            className="hidden px-3 py-1.5 text-xs font-bold rounded-full border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all duration-200 sm:block"
          >
            {locale === 'ar' ? 'EN' : 'عربي'}
          </button>

          {isLoggedIn && <NotificationBell className="hidden sm:block" />}

          {isLoggedIn && user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href={getDashboardLink()}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(235,32,39,0.6)] transition-colors hover:bg-secondary"
              >
                {t.nav.dashboard}
              </Link>
              <button onClick={handleLogout} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className="px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted lg:hidden"
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
          menuOpen ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="container flex flex-col gap-1 py-4">
          <form onSubmit={submitSearch} className="mb-2 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.home.searchPlaceholder}
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </form>

          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
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
              <Link href={getDashboardLink()} onClick={() => setMenuOpen(false)} className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
                {t.nav.dashboard}
              </Link>
              <button onClick={handleLogout} className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-full border border-border px-4 py-2.5 text-center text-sm font-semibold">
                {t.nav.login}
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
                {t.nav.register}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

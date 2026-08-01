'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl">
          <span className="gradient-primary text-white px-2 py-1 rounded-lg text-lg">N</span>
          Nuvexa
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === link.href ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLocale}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors"
          >
            {locale === 'ar' ? 'English' : 'العربية'}
          </button>

          {isLoggedIn && user ? (
            <div className="flex items-center gap-3">
              <Link href={getDashboardLink()} className="text-sm font-medium text-primary hover:underline">
                {t.nav.dashboard}
              </Link>
              <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-foreground">
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors">
                {t.nav.login}
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm font-medium rounded-lg gradient-primary text-white hover:opacity-90 transition-opacity">
                {t.nav.register}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

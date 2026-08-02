'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { authApi } from '@/lib/api';
import { onNotification } from '@/lib/realtime';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BookOpen, GraduationCap, FileText, FolderTree, Settings,
  PlusCircle, Wallet, Heart, BadgeCheck, Bell, LogOut, Menu, X, ChevronDown,
  CheckCheck, Shield, Compass, Award,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Primitives';
import { LogoMark } from '@/components/shared/Logo';

type Role = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: '/admin/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/admin/pending', label: 'Pending Courses', icon: <Compass className="h-5 w-5" /> },
    { href: '/admin/courses', label: 'All Courses', icon: <BookOpen className="h-5 w-5" /> },
    { href: '/admin/payments', label: 'Manual Payments', icon: <Wallet className="h-5 w-5" /> },
    { href: '/admin/users', label: 'Users', icon: <GraduationCap className="h-5 w-5" /> },
    { href: '/admin/categories', label: 'Categories', icon: <FolderTree className="h-5 w-5" /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ],
  INSTRUCTOR: [
    { href: '/instructor/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/instructor/courses', label: 'My Courses', icon: <BookOpen className="h-5 w-5" /> },
    { href: '/instructor/earnings', label: 'Earnings', icon: <Wallet className="h-5 w-5" /> },
  ],
  STUDENT: [
    { href: '/student/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/student/my-courses', label: 'My Courses', icon: <BookOpen className="h-5 w-5" /> },
    { href: '/student/wishlist', label: 'Wishlist', icon: <Heart className="h-5 w-5" /> },
    { href: '/student/certificates', label: 'Certificates', icon: <BadgeCheck className="h-5 w-5" /> },
  ],
};

const ROLE_META: Record<Role, { label: string; gradient: string }> = {
  ADMIN: { label: 'Owner', gradient: 'gradient-purple' },
  INSTRUCTOR: { label: 'Instructor', gradient: 'gradient-cyan' },
  STUDENT: { label: 'Student', gradient: 'gradient-emerald' },
};

export function DashboardShell({
  role,
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  role: Role;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = React.useState<any>(null);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const roleLabel = ROLE_META[role].label;

  React.useEffect(() => {
    authApi.me()
      .then((d) => setUser(d.data))
      .catch(() => router.push('/login'));
    fetchNotifications();
    const off = onNotification((n: any) => {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
    });
    return off;
  }, [router]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (json.success) setNotifications(json.data || []);
    } catch { /* ignore */ }
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  const logout = async () => {
    try { await authApi.logout({}); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('sessionToken');
    router.push('/login');
  };

  const nav = NAV[role];
  const meta = ROLE_META[role];

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark size={36} />
        <div>
          <div className="font-display text-lg font-extrabold leading-none tracking-tight">
            Nuve<span className="logo-gradient-text">xa</span>
          </div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{roleLabel} Panel</div>
        </div>
      </Link>

      <div className="mx-4 mb-4 rounded-2xl bg-gradient-primary-soft p-4 ring-1 ring-primary/10">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-white/60">
            <AvatarImage src={user?.avatarUrl || ''} />
            <AvatarFallback className={cn('font-bold text-white', meta.gradient)}>
              {user?.fullName?.slice(0, 1) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user?.fullName || '...'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? cn('bg-gradient-to-r text-white shadow-card', meta.gradient)
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge ? <Badge variant="destructive" className="px-1.5">{item.badge}</Badge> : null}
              {active && <span className="absolute inset-y-2 -start-3 w-1 rounded-full bg-current opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        {role === 'INSTRUCTOR' && (
          <Link href="/instructor/new-course" className="mb-2 block">
            <Button variant="gradient" className="w-full">
              <PlusCircle className="h-4 w-4" /> {t.instructor.createCourse}
            </Button>
          </Link>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-crimson/10 hover:text-crimson"
        >
          <LogOut className="h-5 w-5" />
          {t.nav.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 p-3 lg:block">
        <div className="h-full overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-[0_8px_40px_-12px_rgba(15,23,42,0.14)]">
          {SidebarContent}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 bg-card shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute end-3 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:ps-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden">
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-bold leading-tight md:text-xl">{title}</h1>
              {subtitle && <p className="hidden truncate text-xs text-muted-foreground md:block">{subtitle}</p>}
            </div>

            {actions}

            <div className="relative">
              <button
                onClick={() => setNotifOpen(true)}
                className="relative rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>

              <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
                <DialogContent className="max-w-md">
                  <DialogTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-secondary" /> Notifications
                  </DialogTitle>
                  <DialogDescription>
                    {unread > 0 ? `${unread} unread` : 'You are all caught up'}
                  </DialogDescription>
                  <div className="mt-3 max-h-[380px] overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">No notifications yet</p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => { setNotifOpen(false); if (n.link) router.push(n.link); }}
                            className={cn(
                              'block w-full rounded-xl border p-3 text-start transition-colors hover:bg-muted/60',
                              !n.isRead ? 'border-secondary/30 bg-secondary/5' : 'border-border'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{n.title}</span>
                              {!n.isRead && <span className="h-2 w-2 rounded-full bg-secondary" />}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground/60">
                              {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {unread > 0 && (
                    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={markAllRead}>
                      <CheckCheck className="h-4 w-4" /> Mark all as read
                    </Button>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 pe-2.5 transition-colors hover:bg-muted"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl || ''} />
                  <AvatarFallback className={cn('text-xs font-bold text-white', meta.gradient)}>
                    {user?.fullName?.slice(0, 1) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[100px] truncate text-sm font-semibold md:block">{user?.fullName || ''}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute end-0 top-full z-50 mt-2 w-52 rounded-xl border border-border bg-card p-1.5 shadow-card">
                    <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                      <Compass className="h-4 w-4" /> Visit Store
                    </Link>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                      <Shield className="h-4 w-4" /> Profile
                    </Link>
                    {role === 'STUDENT' && (
                      <Link href="/student/certificates" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                        <Award className="h-4 w-4" /> Certificates
                      </Link>
                    )}
                    <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-crimson hover:bg-crimson/10">
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className={cn('flex-1 px-4 py-6 md:px-8', className)}>{children}</main>
      </div>
    </div>
  );
}

export function ShellLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

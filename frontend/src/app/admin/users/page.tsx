'use client';

import * as React from 'react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { adminApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { StatCard } from '@/components/ui/DataDisplay';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Primitives';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { formatDate, cn } from '@/lib/utils';
import { Users, GraduationCap, BookOpen, ShieldCheck, Search, Power, BadgeCheck, Phone } from 'lucide-react';

const ROLE_STYLES: Record<string, { label: string; gradient: string; variant: any }> = {
  ADMIN: { label: 'Admin', gradient: 'bg-gradient-purple', variant: 'secondary' },
  INSTRUCTOR: { label: 'Instructor', gradient: 'bg-gradient-cyan', variant: 'accent' },
  STUDENT: { label: 'Student', gradient: 'bg-gradient-emerald', variant: 'outline' },
};

export default function AdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    adminApi.users().then((r) => setUsers(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (id: string) => {
    try {
      await adminApi.toggleUserStatus(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)));
    } catch {}
  };

  const counts = {
    total: users.length,
    students: users.filter((u) => u.role === 'STUDENT').length,
    instructors: users.filter((u) => u.role === 'INSTRUCTOR').length,
    active: users.filter((u) => u.isActive).length,
  };

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (u.fullName || '').toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
      || (u.phone || '').toLowerCase().includes(q);
  });

  return (
    <DashboardShell role="ADMIN" title={t.dash.users} subtitle={`${counts.total} ${t.dash.users}`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t.dash.users} value={counts.total} icon={<Users className="h-5 w-5" />} accent="primary" loading={loading} />
        <StatCard label={t.dash.studentsCount} value={counts.students} icon={<GraduationCap className="h-5 w-5" />} accent="accent" />
        <StatCard label={t.dash.instructors} value={counts.instructors} icon={<BookOpen className="h-5 w-5" />} accent="secondary" />
        <StatCard label={t.dash.activeSessions} value={counts.active} icon={<ShieldCheck className="h-5 w-5" />} accent="success" />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.common.search}
            className="h-10 w-full rounded-xl border border-input bg-card ps-9 pe-3.5 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/60 md:w-72"
          />
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">{filtered.length} {t.dash.users}</p>
      </div>

      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : (
        <Card className="mt-4 overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <div className="col-span-3">{t.common.name}</div>
            <div className="col-span-2">{t.common.email}</div>
            <div className="col-span-2">{t.dash.phoneLabel}</div>
            <div className="col-span-1 text-center">{t.common.role}</div>
            <div className="col-span-2 text-center">{t.dash.joinedAt}</div>
            <div className="col-span-1 text-center">{t.common.status}</div>
            <div className="col-span-1 text-end">{t.common.actions}</div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((user: any) => {
              const role = ROLE_STYLES[user.role] || ROLE_STYLES.STUDENT;
              return (
                <div key={user.id} className="grid grid-cols-1 items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30 md:grid-cols-12">
                  <div className="col-span-3 flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl || ''} />
                      <AvatarFallback className={cn('text-xs font-bold text-white', role.gradient)}>{user.fullName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {user.fullName}
                        {user.instructorProfile?.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-accent" />}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.studentProfile?.country || user.instructorProfile?.headline || formatDate(user.createdAt)}</p>
                    </div>
                  </div>

                  <div className="col-span-2 truncate text-sm text-muted-foreground">{user.email}</div>

                  <div className="col-span-2 truncate text-sm" dir="ltr">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2 py-1 font-medium">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {user.phone || '—'}
                    </span>
                  </div>

                  <div className="col-span-1 text-center">
                    <Badge variant={role.variant}>{user.role}</Badge>
                  </div>

                  <div className="col-span-2 text-center text-xs text-muted-foreground">{formatDate(user.createdAt)}</div>

                  <div className="col-span-1 text-center">
                    <span className={cn('inline-flex h-2.5 w-2.5 rounded-full', user.isActive ? 'bg-success-500' : 'bg-crimson')} />
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button size="sm" variant={user.isActive ? 'dangerOutline' : 'emerald'} onClick={() => toggleStatus(user.id)}>
                      <Power className="h-3.5 w-3.5" /> {user.isActive ? t.admin.deactivate : t.admin.activate}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">{t.common.noData}</p>}
        </Card>
      )}
    </DashboardShell>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { adminApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { StatCard } from '@/components/ui/DataDisplay';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Primitives';
import { RevenueAreaChart, ChartCard, DonutChart, BarsChart } from '@/components/ui/Charts';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { formatPrice, formatDate, formatBytes, formatUptime, cn } from '@/lib/utils';
import {
  Users, GraduationCap, BookOpen, Wallet, ShoppingCart, Clock, Star,
  Database, Zap, Server, TrendingUp, ShieldCheck, AlertTriangle,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { t, locale } = useI18n();
  const [data, setData] = React.useState<any>(null);
  const [mon, setMon] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([adminApi.dashboard(), adminApi.monitoring()])
      .then(([d, m]) => {
        setData(d.data);
        setMon(m.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardShell role="ADMIN" title={t.dash.overview}><PageLoader label={t.common.loading} /></DashboardShell>;
  if (!data) return <DashboardShell role="ADMIN" title={t.dash.overview}><p className="text-crimson">{t.common.error}</p></DashboardShell>;

  const c = data.counts;
  const statusData = [
    { name: t.dash.approved, value: c.approvedCourses, color: '#10b981' },
    { name: t.dash.pendingCourses, value: c.pendingCourses, color: '#f59e0b' },
    { name: t.dash.drafts, value: Math.max(0, c.courses - c.approvedCourses - c.pendingCourses), color: '#64748b' },
  ].filter((d) => d.value > 0);

  return (
    <DashboardShell
      role="ADMIN"
      title={t.dash.overview}
      subtitle={`Nuvexa · ${new Date().toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      actions={
        <Link href="/admin/pending">
          <Button variant="gradient" size="sm" className="relative">
            <Clock className="h-4 w-4" /> {t.dash.pendingCourses}
            {c.pendingCourses > 0 && <Badge variant="destructive" className="absolute -end-2 -top-2 px-1.5 text-[10px]">{c.pendingCourses}</Badge>}
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label={t.dash.users} value={c.users.toLocaleString()} icon={<Users className="h-5 w-5" />} accent="primary" />
        <StatCard label={t.dash.studentsCount} value={c.students.toLocaleString()} icon={<GraduationCap className="h-5 w-5" />} accent="accent" />
        <StatCard label={t.dash.instructors} value={c.instructors} icon={<BookOpen className="h-5 w-5" />} accent="secondary" />
        <StatCard label={t.dash.coursesCount} value={c.courses} icon={<BookOpen className="h-5 w-5" />} accent="warning" />
        <StatCard label={t.dash.orders} value={c.orders} icon={<ShoppingCart className="h-5 w-5" />} accent="success" />
        <StatCard label={t.dash.totalRevenue} value={formatPrice(c.revenueTotal)} icon={<Wallet className="h-5 w-5" />} accent="crimson" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t.dash.dailyRevenue} value={formatPrice(c.revenueToday)} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        <StatCard label={t.dash.weeklyRevenue} value={formatPrice(c.revenueWeek)} icon={<TrendingUp className="h-5 w-5" />} accent="accent" />
        <StatCard label={t.dash.monthlyRevenue} value={formatPrice(c.revenueMonth)} icon={<TrendingUp className="h-5 w-5" />} accent="secondary" />
        <StatCard label={t.dash.yearlyRevenue} value={formatPrice(c.revenueYear)} icon={<TrendingUp className="h-5 w-5" />} accent="primary" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title={t.dash.revenueTrend} subtitle={`${t.dash.salesToday} ${c.salesToday} · ${t.dash.salesWeek} ${c.salesWeek}`} className="xl:col-span-2">
          <RevenueAreaChart data={data.revenueSeries} formatter={(v) => formatPrice(v).replace('.00', '')} />
        </ChartCard>

        <ChartCard title={t.dash.statusDistribution} subtitle={t.dash.coursesCount}>
          {statusData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{t.common.empty}</div>
          ) : (
            <DonutChart data={statusData} centerValue={c.courses} centerLabel={t.dash.coursesCount} formatter={(v) => String(v)} />
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {statusData.map((d) => (
              <Badge key={d.name} variant="outline" className="gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                {d.name} · {d.value}
              </Badge>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title={t.dash.monitoring} subtitle={mon ? `db: ${mon.dbHealth} · ${mon.apiLatencyMs}ms` : ''} className="xl:col-span-2">
          {mon ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat icon={<Database className="h-4 w-4" />} label={t.dash.apiHealth} value={mon.dbHealth} tone={mon.dbHealth === 'OK' ? 'success' : 'crimson'} />
              <MiniStat icon={<Zap className="h-4 w-4" />} label={t.dash.latency} value={`${mon.apiLatencyMs}ms`} tone="primary" />
              <MiniStat icon={<Server className="h-4 w-4" />} label={t.dash.uptime} value={formatUptime(mon.uptimeSeconds)} tone="accent" />
              <MiniStat icon={<Database className="h-4 w-4" />} label={t.dash.dbSize} value={formatBytes(mon.storageUsedBytes)} tone="warning" />
              <MiniStat icon={<Users className="h-4 w-4" />} label={t.dash.newUsersWeek} value={mon.newUsers7d} tone="secondary" />
              <MiniStat icon={<ShoppingCart className="h-4 w-4" />} label={t.dash.newOrdersWeek} value={mon.newOrders7d} tone="success" />
              <MiniStat icon={<AlertTriangle className="h-4 w-4" />} label={t.dash.failedLogins} value={mon.failedLogins7d} tone={mon.failedLogins7d > 0 ? 'crimson' : 'success'} />
              <MiniStat icon={<ShieldCheck className="h-4 w-4" />} label={t.dash.activeSessions} value={mon.activeSessions7d} tone="primary" />
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
          )}
        </ChartCard>

        <ChartCard title={t.dash.topCourses} subtitle="By enrollments">
          {data.topCourses.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
          ) : (
            <div className="space-y-2.5">
              {data.topCourses.map((course: any, i: number) => (
                <Link key={course.id} href={`/admin/courses`} className="flex items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:bg-muted/50">
                  <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center text-muted-foreground">📖</div>}
                    <span className="absolute start-1 top-1 rounded bg-navy-950/70 px-1 text-[9px] font-bold text-white">{i + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{course.title}</p>
                    <p className="text-xs text-muted-foreground">{course.enrollmentCount} {t.dash.students}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-display text-xs font-bold text-success-700 dark:text-success-400">{formatPrice(course.totalRevenue)}</p>
                    {course.averageRating > 0 && <p className="flex items-center justify-end gap-1 text-[10px] text-warning-600"><Star className="h-3 w-3 fill-current" /> {course.averageRating.toFixed(1)}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{t.dash.recentOrders}</CardTitle>
              <CardDescription>Latest completed transactions</CardDescription>
            </div>
            <Link href="/admin/courses" className="text-sm font-medium text-secondary hover:underline">{t.common.viewAll}</Link>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <div className="space-y-3">
                {data.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={order.student?.avatarUrl || ''} />
                      <AvatarFallback className="bg-gradient-purple text-xs font-bold text-white">{order.student?.fullName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{order.student?.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{order.items?.[0]?.course?.title} · {formatDate(order.createdAt, 'relative')}</p>
                    </div>
                    <div className="text-end">
                      <p className="font-display text-sm font-bold">{formatPrice(order.total)}</p>
                      <Badge variant="success" className="mt-1">{order.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{t.dash.recentUsers}</CardTitle>
              <CardDescription>{t.dash.recentUsers}</CardDescription>
            </div>
            <Link href="/admin/users" className="text-sm font-medium text-secondary hover:underline">{t.common.viewAll}</Link>
          </CardHeader>
          <CardContent>
            {data.recentUsers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <div className="space-y-3">
                {data.recentUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl || ''} />
                      <AvatarFallback className={cn('text-xs font-bold text-white', user.role === 'INSTRUCTOR' ? 'bg-gradient-cyan' : user.role === 'ADMIN' ? 'bg-gradient-purple' : 'bg-gradient-emerald')}>
                        {user.fullName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{user.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant={user.role === 'ADMIN' ? 'secondary' : user.role === 'INSTRUCTOR' ? 'accent' : 'outline'}>{user.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: string }) {
  const tones: Record<string, string> = {
    success: 'text-success-600 dark:text-success-400 bg-success/10',
    crimson: 'text-crimson bg-crimson/10',
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    warning: 'text-warning-600 dark:text-warning-400 bg-warning/10',
    secondary: 'text-secondary bg-secondary/10',
  };
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-lg', tones[tone])}>{icon}</div>
      <p className="font-display text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

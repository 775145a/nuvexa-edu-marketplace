'use client';

import * as React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { instructorApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { StatCard } from '@/components/ui/DataDisplay';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, PageLoader, Spinner } from '@/components/ui/Primitives';
import { RevenueAreaChart, ChartCard, DonutChart } from '@/components/ui/Charts';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import {
  BookOpen, PlusCircle, Users, Wallet, Star, Eye, TrendingUp, Clock, ClipboardList, CheckCircle2, XCircle,
} from 'lucide-react';

const STATUS_GRADIENT: Record<string, string> = {
  APPROVED: 'gradient-emerald',
  PENDING_REVIEW: 'gradient-amber',
  REJECTED: 'gradient-crimson',
  DRAFT: 'gradient-navy',
};

export default function InstructorDashboardPage() {
  const { t, locale } = useI18n();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    instructorApi.dashboard()
      .then((r) => setData(r.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardShell role="INSTRUCTOR" title="Dashboard"><PageLoader label={t.common.loading} /></DashboardShell>;

  if (error || !data) {
    return (
      <DashboardShell role="INSTRUCTOR" title="Dashboard">
        <div className="rounded-2xl border border-crimson/20 bg-crimson/5 p-8 text-center">
          <p className="text-crimson">{error}</p>
        </div>
      </DashboardShell>
    );
  }

  const s = data.stats;
  const statusData = [
    { name: t.dash.published, value: s.publishedCount, color: '#10b981' },
    { name: t.dash.pendingCourses, value: s.pendingCount, color: '#f59e0b' },
    { name: t.dash.rejected, value: s.rejectedCount, color: '#e11d48' },
    { name: t.dash.drafts, value: Math.max(0, s.courseCount - s.publishedCount - s.pendingCount - s.rejectedCount), color: '#64748b' },
  ].filter((d) => d.value > 0);

  return (
    <DashboardShell
      role="INSTRUCTOR"
      title={t.dash.overview}
      subtitle={t.dash.welcome}
      actions={
        <Link href="/instructor/new-course">
          <Button variant="gradient" size="sm">
            <PlusCircle className="h-4 w-4" /> {t.instructor.createCourse}
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label={t.dash.coursesCount} value={s.courseCount} icon={<BookOpen className="h-5 w-5" />} accent="primary" loading={loading} />
        <StatCard label={t.dash.totalStudents} value={s.totalStudents.toLocaleString()} icon={<Users className="h-5 w-5" />} accent="accent" />
        <StatCard label={t.dash.totalRevenue} value={formatPrice(s.totalRevenue)} icon={<Wallet className="h-5 w-5" />} accent="success" />
        <StatCard label={t.dash.avgRating} value={s.averageRating ? s.averageRating.toFixed(1) : '—'} icon={<Star className="h-5 w-5" />} accent="warning" />
        <StatCard label={t.dash.published} value={s.publishedCount} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label={t.dash.pendingCourses} value={s.pendingCount} icon={<Clock className="h-5 w-5" />} accent="warning" />
        <StatCard label={t.dash.totalSales} value={s.salesCount} icon={<ClipboardList className="h-5 w-5" />} accent="secondary" />
        <StatCard label={t.dash.pendingPayout} value={formatPrice(s.pendingPayout)} icon={<TrendingUp className="h-5 w-5" />} accent="crimson" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title={t.dash.revenueTrend} subtitle="Last 14 days" className="xl:col-span-2">
          <RevenueAreaChart data={data.revenueSeries} formatter={(v) => formatPrice(v).replace('.00', '')} />
        </ChartCard>

        <ChartCard title={t.dash.statusDistribution} subtitle={t.dash.coursesCount}>
          {statusData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{t.common.empty}</div>
          ) : (
            <DonutChart
              data={statusData}
              centerValue={s.courseCount}
              centerLabel={t.dash.coursesCount}
              formatter={(v) => String(v)}
            />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {statusData.map((d) => (
              <Badge key={d.name} variant="outline" className="gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                {d.name} · {d.value}
              </Badge>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{t.dash.latestSales}</CardTitle>
              <CardDescription>Recent completed orders</CardDescription>
            </div>
            <Link href="/instructor/earnings" className="text-sm font-medium text-secondary hover:underline">{t.common.viewAll}</Link>
          </CardHeader>
          <CardContent>
            {data.latestSales.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <div className="space-y-3">
                {data.latestSales.map((sale: any) => (
                  <div key={sale.id} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={sale.student?.avatarUrl || ''} />
                      <AvatarFallback className="bg-gradient-cyan text-xs font-bold text-white">{sale.student?.fullName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{sale.student?.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sale.items?.[0]?.course?.title} · {formatDate(sale.createdAt, 'relative')}
                      </p>
                    </div>
                    <span className="font-display text-sm font-bold text-success-700 dark:text-success-400">
                      {formatPrice(sale.items?.[0]?.price || sale.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{t.dash.topCourses}</CardTitle>
              <CardDescription>By enrollments</CardDescription>
            </div>
            <Link href="/instructor/courses" className="text-sm font-medium text-secondary hover:underline">{t.common.viewAll}</Link>
          </CardHeader>
          <CardContent>
            {data.topCourses.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <div className="space-y-3">
                {data.topCourses.map((course: any, i: number) => (
                  <Link key={course.id} href={`/instructor/courses/${course.id}/manage`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                    <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">📖</div>
                      )}
                      <span className="absolute start-1.5 top-1.5 rounded-md bg-navy-950/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{locale === 'ar' ? (course.titleAr || course.title) : course.title}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {course.enrollmentCount || 0}
                        {course.averageRating > 0 && (
                          <span className="flex items-center gap-0.5 text-warning-600"><Star className="h-3 w-3 fill-current" /> {course.averageRating.toFixed(1)}</span>
                        )}
                      </p>
                    </div>
                    <Badge variant={course.status === 'APPROVED' ? 'success' : course.status === 'PENDING_REVIEW' ? 'warning' : course.status === 'REJECTED' ? 'destructive' : 'outline'}>
                      {course.status === 'APPROVED' ? t.dash.approved : course.status === 'PENDING_REVIEW' ? t.dash.pendingCourses : course.status === 'REJECTED' ? t.dash.rejected : t.dash.drafts}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

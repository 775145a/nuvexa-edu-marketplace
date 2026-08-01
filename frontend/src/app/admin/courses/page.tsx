'use client';

import * as React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { adminApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { StatCard } from '@/components/ui/DataDisplay';
import { StatusBadge, EmptyState } from '@/components/ui/DataDisplay';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Primitives';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { formatDate, formatPrice, cn, courseCategoryLabel } from '@/lib/utils';
import { Search, BookOpen, Eye, Clock, Users, Wallet, ArrowLeft } from 'lucide-react';

const FILTERS = ['ALL', 'APPROVED', 'PENDING_REVIEW', 'REJECTED', 'DRAFT'] as const;

export default function AdminCoursesPage() {
  const { t, locale } = useI18n();
  const [courses, setCourses] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>('ALL');
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    adminApi.courses().then((r) => setCourses(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const counts = {
    ALL: courses.length,
    APPROVED: courses.filter((c) => c.status === 'APPROVED').length,
    PENDING_REVIEW: courses.filter((c) => c.status === 'PENDING_REVIEW').length,
    REJECTED: courses.filter((c) => c.status === 'REJECTED').length,
    DRAFT: courses.filter((c) => c.status === 'DRAFT').length,
  };

  const filtered = courses.filter((c) => {
    if (filter !== 'ALL' && c.status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (c.title || '').toLowerCase().includes(q) || (c.titleAr || '').toLowerCase().includes(q);
  });

  const totalEnrollments = courses.reduce((s, c) => s + (c._count?.enrollments || 0), 0);

  return (
    <DashboardShell role="ADMIN" title={t.dash.allCourses} subtitle={`${courses.length} ${t.dash.coursesCount} · ${totalEnrollments} ${t.dash.students}`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t.dash.coursesCount} value={courses.length} icon={<BookOpen className="h-5 w-5" />} accent="primary" loading={loading} />
        <StatCard label={t.dash.approved} value={counts.APPROVED} icon={<BookOpen className="h-5 w-5" />} accent="success" />
        <StatCard label={t.dash.pendingCourses} value={counts.PENDING_REVIEW} icon={<Clock className="h-5 w-5" />} accent="warning" />
        <StatCard label={t.dash.rejected} value={counts.REJECTED} icon={<BookOpen className="h-5 w-5" />} accent="crimson" />
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                filter === f ? 'border-primary bg-primary text-white shadow-soft' : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {f === 'ALL' ? t.common.all : f === 'APPROVED' ? t.dash.approved : f === 'PENDING_REVIEW' ? t.dash.pendingCourses : f === 'REJECTED' ? t.dash.rejected : t.dash.drafts}
              <span className="ms-1.5 opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.common.search}
            className="h-10 w-full rounded-xl border border-input bg-card ps-9 pe-3.5 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/60 md:w-64"
          />
        </div>
      </div>

      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<BookOpen className="h-8 w-8" />} title={t.admin.noCourses} />
        </div>
      ) : (
        <Card className="mt-5 overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <div className="col-span-5">{t.dash.coursesCount}</div>
            <div className="col-span-2 text-center">{t.dash.instructors}</div>
            <div className="col-span-1 text-center">{t.dash.students}</div>
            <div className="col-span-1 text-center">{t.dash.revenue}</div>
            <div className="col-span-1 text-center">{t.dash.statusDistribution}</div>
            <div className="col-span-2 text-end">{t.common.actions}</div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((course: any) => (
              <div key={course.id} className="grid grid-cols-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30 md:grid-cols-12">
                <div className="col-span-5 flex items-center gap-3">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center text-lg text-muted-foreground">📖</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{locale === 'ar' ? (course.titleAr || course.title) : course.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{courseCategoryLabel(course, locale)} · {formatDate(course.createdAt)}</p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={course.instructor?.avatarUrl || ''} />
                    <AvatarFallback className="bg-gradient-cyan text-[9px] font-bold text-white">{course.instructor?.fullName?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs text-muted-foreground">{course.instructor?.fullName}</span>
                </div>

                <div className="col-span-1 text-center text-sm font-medium">{course._count?.enrollments || 0}</div>
                <div className="col-span-1 text-center font-display text-xs font-bold">{formatPrice(course.price || 0)}</div>

                <div className="col-span-1 flex justify-center">
                  <StatusBadge status={course.status} />
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  {course.status === 'PENDING_REVIEW' && (
                    <Link href={`/admin/pending/${course.id}`}>
                      <Button size="sm" variant="emerald"><Eye className="h-3.5 w-3.5" /> {t.dash.reviewCourse}</Button>
                    </Link>
                  )}
                  <Link href={`/courses/${course.slug}`} className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted">
                    <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}

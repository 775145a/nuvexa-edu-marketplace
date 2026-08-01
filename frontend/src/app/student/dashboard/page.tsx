'use client';

import * as React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { studentApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { StatCard } from '@/components/ui/DataDisplay';
import { ProgressBar } from '@/components/ui/DataDisplay';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Primitives';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { formatDate, cn } from '@/lib/utils';
import {
  PlayCircle, Award, Bell, ClipboardList, FileQuestion, Clock, Star, ArrowLeft, BookOpen, TrendingUp,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { t, locale } = useI18n();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    studentApi.dashboard()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardShell role="STUDENT" title={t.dash.overview}><PageLoader label={t.common.loading} /></DashboardShell>;
  if (!data) return <DashboardShell role="STUDENT" title={t.dash.overview}><p className="text-crimson">{t.common.error}</p></DashboardShell>;

  const enrollments = data.enrollments || [];
  const completedCount = enrollments.filter((e: any) => e.completedAt).length;
  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((s: number, e: any) => s + (e.progress || 0), 0) / enrollments.length)
    : 0;
  const passedExams = (data.examResults || []).filter((r: any) => r.passed).length;

  return (
    <DashboardShell
      role="STUDENT"
      title={t.dash.welcome}
      subtitle={new Date().toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
      actions={
        <Link href="/courses">
          <Button variant="gradient" size="sm">
            <BookOpen className="h-4 w-4" /> {t.dash.myProgress}
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t.dash.studentsCount} value={enrollments.length} icon={<BookOpen className="h-5 w-5" />} accent="primary" />
        <StatCard label={t.dash.certificates} value={data.certificates?.length || 0} icon={<Award className="h-5 w-5" />} accent="success" />
        <StatCard label={t.dash.avgRating} value={`${avgProgress}%`} icon={<TrendingUp className="h-5 w-5" />} accent="accent" />
        <StatCard label={t.dash.notifications} value={data.unreadCount || 0} icon={<Bell className="h-5 w-5" />} accent="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{t.dash.continueLearning}</CardTitle>
              <CardDescription>{t.dash.lastLessons}</CardDescription>
            </div>
            <Link href="/student/my-courses" className="text-sm font-medium text-secondary hover:underline">{t.common.viewAll}</Link>
          </CardHeader>
          <CardContent>
            {data.continueLearning.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center">
                <PlayCircle className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-semibold">{t.dash.noPending}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.dash.noPendingDesc}</p>
                <Link href="/courses" className="mt-4">
                  <Button variant="gradient" size="sm"><BookOpen className="h-4 w-4" /> {t.dash.myCourses}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.continueLearning.map((item: any) => {
                  const course = item.lecture?.section?.course;
                  return (
                    <Link key={item.id} href={`/learn/${course?.id}`} className="flex items-center gap-4 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {course?.thumbnailUrl ? (
                          <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">📖</div>
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-navy-950/30 opacity-0 transition-opacity hover:opacity-100">
                          <PlayCircle className="h-7 w-7 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{locale === 'ar' ? (course?.titleAr || course?.title) : course?.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.lecture?.section?.title} · {item.lecture?.title}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <ProgressBar value={(item.position / (item.lecture?.duration || 1)) * 100} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground">{formatDate(item.updatedAt, 'relative')}</span>
                        </div>
                      </div>
                      <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dash.exams}</CardTitle>
            <CardDescription>Recent exam attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {data.examResults.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <div className="space-y-2.5">
                {data.examResults.map((result: any) => (
                  <div key={result.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', result.passed ? 'bg-success/10 text-success-600' : 'bg-crimson/10 text-crimson')}>
                      <FileQuestion className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{result.exam?.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(result.createdAt)}</p>
                    </div>
                    <div className="text-end">
                      <p className="font-display text-sm font-bold">{result.score}%</p>
                      <Badge variant={result.passed ? 'success' : 'destructive'} className="mt-1">{result.passed ? t.dash.approved : t.dash.rejected}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{t.dash.myCourses}</CardTitle>
              <CardDescription>{t.dash.myProgress}</CardDescription>
            </div>
            <Link href="/student/my-courses" className="text-sm font-medium text-secondary hover:underline">{t.common.viewAll}</Link>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <div className="space-y-4">
                {enrollments.slice(0, 5).map((enrollment: any) => {
                  const course = enrollment.course;
                  const done = !!enrollment.completedAt;
                  return (
                    <Link key={enrollment.id} href={`/learn/${course.id}`} className="block">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center text-muted-foreground">📖</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{locale === 'ar' ? (course.titleAr || course.title) : course.title}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <ProgressBar value={enrollment.progress || 0} className="h-1.5 flex-1" gradient={done ? 'bg-gradient-to-r from-success-500 to-success-400' : undefined} />
                            <span className="text-[10px] font-semibold text-muted-foreground">{Math.round(enrollment.progress || 0)}%</span>
                          </div>
                        </div>
                        {done && <Badge variant="success">{t.dash.approved}</Badge>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{t.dash.certificates}</CardTitle>
              <CardDescription>{t.dash.notifications}</CardDescription>
            </div>
            <Link href="/student/certificates" className="text-sm font-medium text-secondary hover:underline">{t.common.viewAll}</Link>
          </CardHeader>
          <CardContent>
            {data.certificates.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <div className="space-y-3">
                {data.certificates.slice(0, 4).map((cert: any) => (
                  <Link key={cert.id} href="/student/certificates" className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 dark:from-amber-500/20 dark:to-amber-500/10">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{cert.course?.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(cert.completionDate, 'long')}</p>
                    </div>
                    <Badge variant="success"><Star className="h-3 w-3" /> {t.dash.approved}</Badge>
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

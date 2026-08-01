'use client';

import * as React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { adminApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { StatCard } from '@/components/ui/DataDisplay';
import { EmptyState } from '@/components/ui/DataDisplay';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Primitives';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { formatDate, formatPrice, cn, courseCategoryLabel } from '@/lib/utils';
import {
  Clock, Layers, PlayCircle, FileQuestion, ClipboardList, Users, Eye, ArrowLeft, CheckCircle2, Compass,
} from 'lucide-react';

export default function AdminPendingPage() {
  const { t, locale } = useI18n();
  const [courses, setCourses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    adminApi.pendingCourses()
      .then((r) => setCourses(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      role="ADMIN"
      title={t.dash.pendingCourses}
      subtitle={t.dash.approvalNote}
    >
      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-8 w-8" />}
          title={t.dash.noPending}
          description={t.dash.noPendingDesc}
          action={
            <Link href="/admin/dashboard">
              <Button variant="outline"><ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t.dash.overview}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={t.dash.pendingCourses} value={courses.length} icon={<Clock className="h-5 w-5" />} accent="warning" />
            <StatCard
              label={t.dash.videosCount}
              value={courses.reduce((s, c) => s + c.videosCount, 0)}
              icon={<PlayCircle className="h-5 w-5" />}
              accent="accent"
            />
            <StatCard
              label={t.dash.lectures}
              value={courses.reduce((s, c) => s + c.lecturesCount, 0)}
              icon={<Layers className="h-5 w-5" />}
              accent="primary"
            />
            <StatCard
              label={t.dash.quizzes}
              value={courses.reduce((s, c) => s + c.examsCount + c.assignmentsCount, 0)}
              icon={<FileQuestion className="h-5 w-5" />}
              accent="secondary"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="group flex flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
                <div className="relative h-36 overflow-hidden bg-muted">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">📖</div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-navy-950/70 to-transparent" />
                  <Badge variant="warning" className="absolute start-3 top-3 shadow-card">
                    <Clock className="h-3 w-3" /> {t.dash.pendingCourses}
                  </Badge>
                  <div className="absolute bottom-2.5 start-3 end-3">
                    <p className="truncate font-display text-sm font-bold text-white drop-shadow">
                      {locale === 'ar' ? (course.titleAr || course.title) : course.title}
                    </p>
                    {course.category && (
                      <p className="text-[11px] text-white/80">{courseCategoryLabel(course, locale)}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={course.instructor?.avatarUrl || ''} />
                        <AvatarFallback className="bg-gradient-cyan text-[10px] font-bold text-white">{course.instructor?.fullName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs font-medium text-muted-foreground">{course.instructor?.fullName}</span>
                    </div>
                    <span className="font-display text-sm font-bold text-success-700 dark:text-success-400">{formatPrice(course.price || 0)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <MetaChip icon={<Layers className="h-3.5 w-3.5" />} label={`${course.sectionsCount} ${t.dash.sections}`} />
                    <MetaChip icon={<PlayCircle className="h-3.5 w-3.5" />} label={`${course.lecturesCount} ${t.dash.lectures}`} />
                    <MetaChip icon={<Compass className="h-3.5 w-3.5" />} label={`${course.videosCount} ${t.dash.videosCount}`} />
                    <MetaChip icon={<FileQuestion className="h-3.5 w-3.5" />} label={`${course.examsCount} ${t.dash.quizzes}`} />
                    <MetaChip icon={<ClipboardList className="h-3.5 w-3.5" />} label={`${course.assignmentsCount} ${t.dash.assignments}`} />
                    <MetaChip icon={<Users className="h-3.5 w-3.5" />} label={`${course.enrollmentsCount} ${t.dash.students}`} />
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                    <span className="text-[11px] text-muted-foreground">
                      {t.dash.submittedAt}: {formatDate(course.submittedForReviewAt, 'relative')}
                    </span>
                    <Link href={`/admin/pending/${course.id}`}>
                      <Button size="sm" variant="gradient">
                        <Eye className="h-3.5 w-3.5" /> {t.dash.reviewCourse}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-muted-foreground">
      {icon}
      <span className="truncate font-medium">{label}</span>
    </div>
  );
}

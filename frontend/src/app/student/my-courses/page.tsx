'use client';

import * as React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { studentApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { ProgressBar } from '@/components/ui/DataDisplay';
import { EmptyState } from '@/components/ui/DataDisplay';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Primitives';
import { BookOpen, PlayCircle, Award, Star, Clock } from 'lucide-react';

export default function MyCoursesPage() {
  const { t, locale } = useI18n();
  const [courses, setCourses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    studentApi.enrolled()
      .then((r) => setCourses(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="STUDENT" title={t.dash.myCourses} subtitle={`${courses.length} ${t.dash.studentsCount}`}>
      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title={t.student.notEnrolled}
          action={<Link href="/courses"><Button variant="gradient"><BookOpen className="h-4 w-4" /> {t.courses.browse}</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((enrollment: any) => {
            const course = enrollment.course || {};
            const progress = Math.round(enrollment.progress || 0);
            const done = !!enrollment.completedAt || progress >= 100;
            return (
              <Card key={enrollment.id} className="group flex flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
                <Link href={`/learn/${course.id}`} className="relative block aspect-video overflow-hidden bg-muted">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">📖</div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-navy-950/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-card">
                      <PlayCircle className="h-6 w-6" />
                    </span>
                  </div>
                  {done && (
                    <Badge variant="success" className="absolute end-3 top-3 shadow-card">
                      <Award className="h-3 w-3" /> {t.dash.approved}
                    </Badge>
                  )}
                </Link>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <Link href={`/learn/${course.id}`}>
                    <h3 className="line-clamp-1 font-semibold transition-colors group-hover:text-secondary">
                      {locale === 'ar' ? (course.titleAr || course.title) : course.title}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-warning-500" /> {(course.averageRating || 0).toFixed(1)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.enrollmentCount} {t.dash.students}</span>
                  </div>

                  <div className="mt-auto">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t.student.progress}</span>
                      <span className="font-bold">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} gradient={done ? 'bg-gradient-to-r from-success-500 to-success-400' : undefined} />
                    <Link href={`/learn/${course.id}`} className="mt-3 block">
                      <Button variant={done ? 'outline' : 'gradient'} size="sm" className="w-full">
                        <PlayCircle className="h-4 w-4" /> {done ? t.dash.reviewCourse : t.dash.continueLearning}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

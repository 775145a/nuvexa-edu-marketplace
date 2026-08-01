'use client';

import * as React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { studentApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { EmptyState } from '@/components/ui/DataDisplay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Primitives';
import { formatDate } from '@/lib/utils';
import { Award, BookOpen, ShieldCheck, Star } from 'lucide-react';

export default function CertificatesPage() {
  const { t, locale } = useI18n();
  const [certs, setCerts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    studentApi.enrolled()
      .then((r) => {
        const completed = (r.data || []).filter((e: any) => e.completedAt || (e.progress || 0) >= 100);
        setCerts(completed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="STUDENT" title={t.dash.certificates} subtitle={`${certs.length} ${t.dash.certificates}`}>
      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : certs.length === 0 ? (
        <EmptyState
          icon={<Award className="h-8 w-8" />}
          title={t.student.noCertificates}
          description={t.student.completeCourses}
          action={<Link href="/courses"><Button variant="gradient"><BookOpen className="h-4 w-4" /> {t.courses.browse}</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {certs.map((cert: any, i: number) => {
            const course = cert.course || {};
            const completedAt = cert.completedAt || cert.updatedAt;
            return (
              <div
                key={cert.id}
                className="group relative overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-50 via-card to-amber-50/50 p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow dark:from-amber-500/10 dark:via-card dark:to-amber-500/5"
              >
                <div className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-2xl" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #d97706 1px, transparent 0)', backgroundSize: '18px 18px' }} />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-card">
                    <Award className="h-7 w-7" />
                  </div>
                  <div className="text-end">
                    <Badge variant="warning"><Star className="h-3 w-3" /> {t.dash.approved}</Badge>
                    <p className="mt-1.5 text-xs text-muted-foreground">{formatDate(completedAt, 'long')}</p>
                  </div>
                </div>

                <div className="relative mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600/80">Nuvexa</p>
                  <h3 className="mt-1 font-display text-lg font-extrabold">{locale === 'ar' ? (course.titleAr || course.title) : course.title}</h3>
                  <div className="mt-4 flex items-center justify-between border-t border-amber-300/30 pt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.dash.certificates}</p>
                      <p className="text-sm font-semibold">{t.dash.approved} ✓</p>
                    </div>
                    <span className="font-display text-3xl font-black text-amber-500/40">#{i + 1}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

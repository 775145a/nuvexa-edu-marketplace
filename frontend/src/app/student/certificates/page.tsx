'use client';

import * as React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { studentApi, authApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { EmptyState } from '@/components/ui/DataDisplay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Primitives';
import { downloadCertificatePdf } from '@/lib/certificatePdf';
import { formatDate } from '@/lib/utils';
import { Award, BookOpen, Download, Loader2 } from 'lucide-react';

type Cert = {
  id: string;
  certificateNumber: string;
  completionDate: string;
  student?: { fullName?: string };
  course: {
    id: string;
    title: string;
    titleAr?: string;
    slug?: string;
    instructor?: { fullName?: string };
  };
};

function CertificateTemplate({ cert, userName, locale }: { cert: Cert; userName: string; locale: string }) {
  const courseTitle = locale === 'ar' ? cert.course.titleAr || cert.course.title : cert.course.title;
  const date = new Date(cert.completionDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <div
      className="certificate-template"
      dir="ltr"
      style={{
        width: '1122px',
        height: '794px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        position: 'relative',
        fontFamily: 'Tahoma, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: '24px', border: '3px solid #4f46e5', borderRadius: '24px' }} />
      <div style={{ position: 'absolute', inset: '34px', border: '1px solid #c7d2fe', borderRadius: '16px' }} />
      <div style={{ position: 'absolute', top: '96px', left: '0', right: '0', textAlign: 'center' }}>
        <div style={{ fontSize: '44px', fontWeight: 800, letterSpacing: '0.1em', color: '#4f46e5' }}>NUVEXA</div>
        <div style={{ fontSize: '14px', color: '#94a3b8', letterSpacing: '0.4em', marginTop: '4px' }}>LEARNING PLATFORM</div>
      </div>
      <div style={{ position: 'absolute', top: '230px', left: '0', right: '0', textAlign: 'center' }}>
        <div style={{ fontSize: '30px', color: '#64748b', letterSpacing: '0.15em' }}>
          {locale === 'ar' ? 'شهادة إتمام' : 'CERTIFICATE OF COMPLETION'}
        </div>
        <div style={{ marginTop: '40px', fontSize: '18px', color: '#475569' }}>
          {locale === 'ar' ? 'تُمنح هذه الشهادة إلى' : 'This certificate is presented to'}
        </div>
        <div
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          style={{ marginTop: '12px', fontSize: '56px', fontWeight: 800, color: '#0f172a', padding: '0 80px' }}
        >
          {userName}
        </div>
        <div dir={locale === 'ar' ? 'rtl' : 'ltr'} style={{ marginTop: '20px', fontSize: '18px', color: '#475569', padding: '0 100px', lineHeight: 1.6 }}>
          {locale === 'ar' ? 'لإتمامه بنجاح' : 'for successfully completing the course'}
          <span style={{ display: 'block', marginTop: '8px', fontSize: '26px', fontWeight: 700, color: '#4f46e5' }}>
            «{courseTitle}»
          </span>
        </div>
      </div>
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} style={{ position: 'absolute', bottom: '60px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '120px', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>{locale === 'ar' ? 'تاريخ الإصدار' : 'Issue date'}</div>
          <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 600 }}>{date}</div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>{locale === 'ar' ? 'رقم الشهادة' : 'Certificate number'}</div>
          <div style={{ marginTop: '6px', fontSize: '16px', fontWeight: 600, direction: 'ltr' }}>{cert.certificateNumber}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '150px', left: '0', right: '0', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
        {cert.course.instructor?.fullName ? `${locale === 'ar' ? 'بإشراف' : 'Instructor'} — ${cert.course.instructor.fullName}` : 'Nuvexa'}
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const { t, locale } = useI18n();
  const [certs, setCerts] = React.useState<Cert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userName, setUserName] = React.useState('');
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [activeCert, setActiveCert] = React.useState<Cert | null>(null);
  const hiddenRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    Promise.all([studentApi.certificates(), authApi.me().catch(() => null)])
      .then(([r, me]) => {
        const data = (r.data || []).filter((c: Cert) => c.certificateNumber);
        setCerts(data);
        setActiveCert(data[0] || null);
        setUserName(me?.data?.fullName || me?.data?.name || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const download = async (cert: Cert) => {
    if (!hiddenRef.current) return;
    setDownloading(cert.id);
    setActiveCert(cert);
    try {
      await new Promise((r) => setTimeout(r, 120));
      await downloadCertificatePdf(hiddenRef.current, `Nuvexa-Certificate-${cert.certificateNumber}.pdf`);
    } catch {
      window.print();
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DashboardShell role="STUDENT" title={t.certificate.title} subtitle={`${certs.length} ${t.certificate.myCertificates}`}>
      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : certs.length === 0 ? (
        <EmptyState
          icon={<Award className="h-8 w-8" />}
          title={t.certificate.empty}
          description={t.certificate.emptyDesc}
          action={
            <Link href="/courses">
              <Button variant="gradient">
                <BookOpen className="h-4 w-4" /> {t.courses.browse}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {certs.map((cert) => (
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
                  <Badge variant="warning">
                    <Award className="h-3 w-3" /> {t.dash.approved}
                  </Badge>
                  <p className="mt-1.5 text-xs text-muted-foreground">{formatDate(cert.completionDate, 'long')}</p>
                </div>
              </div>

              <div className="relative mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600/80">Nuvexa</p>
                <h3 className="mt-1 font-display text-lg font-extrabold">
                  {locale === 'ar' ? cert.course.titleAr || cert.course.title : cert.course.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.certificate.certificateNumber}: <span dir="ltr" className="font-mono">{cert.certificateNumber}</span>
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-amber-300/30 pt-4">
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => download(cert)}
                    disabled={downloading === cert.id}
                  >
                    {downloading === cert.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {t.certificate.downloadPdf}
                  </Button>
                  {cert.course.slug ? (
                    <Link href={`/courses/${cert.course.slug}`} className="text-xs font-semibold text-primary hover:underline">
                      {t.courses.viewCourse}
                    </Link>
                  ) : (
                    <Link href={`/learn/${cert.course.id}`} className="text-xs font-semibold text-primary hover:underline">
                      {t.courses.viewCourse}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={hiddenRef} aria-hidden="true" style={{ position: 'fixed', top: 0, left: '-10000px', zIndex: -1 }}>
        {activeCert && <CertificateTemplate cert={activeCert} userName={userName || (activeCert.student?.fullName || '')} locale={locale} />}
      </div>
    </DashboardShell>
  );
}

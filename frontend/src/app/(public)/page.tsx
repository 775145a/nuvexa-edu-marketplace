'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { statsApi, categoryApi, authApi, WHATSAPP_LINK } from '@/lib/api';
import { CourseCard } from '@/components/shared/CourseCard';
import { WhatsAppButton } from '@/components/shared/WhatsAppButton';
import {
  PlayCircle, BookOpen, GraduationCap, Users, ShoppingBag, Wallet,
  Mail, ArrowUpRight, Sparkles, Headset, CheckCircle2,
} from 'lucide-react';

type Course = Record<string, any>;
type Category = Record<string, any>;

const SUPPORT_EMAIL = 'almisriualqaysar@gmail.com';

export default function HomePage() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    Promise.allSettled([
      statsApi.get(),
      categoryApi.list(),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/instructors`).then((r) => r.json()),
    ]).then(([s, c, i]) => {
      if (s.status === 'fulfilled') setStats(s.value.data);
      if (c.status === 'fulfilled') setCategories(c.value.data || []);
      if (i.status === 'fulfilled') setInstructors(i.value?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
      authApi.me().then((r) => setUser(r.data)).catch(() => {});
    }
  }, []);

  const dashboardHref = user
    ? user.role === 'ADMIN' ? '/admin/dashboard'
      : user.role === 'INSTRUCTOR' ? '/instructor/dashboard'
        : '/student/dashboard'
        : '/register';

  const latest = stats?.latest || [];
  const topSelling = stats?.topSelling || [];
  const topRated = stats?.topRated || [];
  const counts = stats?.counts || {};

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="gradient-hero relative overflow-hidden text-white">
        <div className="pointer-events-none absolute -top-24 -start-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -end-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 start-1/3 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="container relative py-16 md:py-28 text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            {t.home.heroBadge}
          </div>

          <h1 className="animate-fade-up mx-auto mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[1.15] md:text-6xl" style={{ animationDelay: '80ms' }}>
            {t.home.heroTitle.split(' ').slice(0, 2).join(' ')}{' '}
            <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
              {t.home.heroTitle.split(' ').slice(2).join(' ')}
            </span>
          </h1>

          <p className="animate-fade-up mx-auto mt-5 max-w-2xl text-base text-white/70 md:text-xl" style={{ animationDelay: '160ms' }}>
            {t.home.heroSubtitle}
          </p>

          <div className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: '240ms' }}>
            <Link
              href={dashboardHref}
              className="btn-gradient inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-lg font-semibold text-white"
            >
              <PlayCircle className="h-5 w-5" />
              {user ? t.nav.dashboard : t.home.startLearning}
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-lg font-semibold text-white backdrop-blur transition-all hover:bg-white/15"
            >
              <BookOpen className="h-5 w-5" />
              {t.home.browseCourses}
            </Link>
          </div>
        </div>
      </section>

      {/* ============ LIVE STATS ============ */}
      <section className="relative z-10 -mt-10 px-4">
        <div className="container">
          <div className="glass-card grid grid-cols-2 gap-6 rounded-2xl p-6 md:grid-cols-5 md:p-8">
            <StatItem label={t.home.statsLabelCourses} value={counts.courses} icon={<BookOpen className="h-5 w-5" />} loading={loading} />
            <StatItem label={t.home.statsLabelStudents} value={counts.students} icon={<Users className="h-5 w-5" />} loading={loading} />
            <StatItem label={t.home.statsLabelInstructors} value={counts.instructors} icon={<GraduationCap className="h-5 w-5" />} loading={loading} />
            <StatItem label={t.home.statsLabelSales} value={counts.sales} icon={<ShoppingBag className="h-5 w-5" />} loading={loading} />
            <StatItem
              label={t.home.statsLabelRevenue}
              value={counts.revenue}
              prefix=""
              suffix=" EGP"
              icon={<Wallet className="h-5 w-5" />}
              loading={loading}
            />
          </div>
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      <section className="py-14 md:py-20">
        <div className="container">
          <SectionHeader title={t.home.allCategories} linkText={t.home.viewAll} href="/categories" />
          {categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {categories.slice(0, 8).map((cat, i) => (
                <Link
                  key={cat.id}
                  href={`/courses?category=${cat.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 card-hover"
                >
                  <div className="pointer-events-none absolute -end-6 -top-6 h-24 w-24 rounded-full bg-gradient-primary-soft opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="text-3xl transition-transform duration-300 group-hover:scale-110">{cat.icon || '📚'}</div>
                  <div className="mt-3 font-display text-sm font-bold">
                    {locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {cat._count?.courses || 0} {t.home.statsCourses}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5">
                  <div className="skeleton h-10 w-10 rounded-xl" />
                  <div className="skeleton mt-4 h-4 w-2/3" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ LATEST COURSES ============ */}
      <CourseSection
        id="latest"
        eyebrow={t.home.latestCourses}
        title={t.courses.explore}
        href="/courses"
        loading={loading}
        courses={latest}
        emptyTitle={t.home.emptyCourses}
        emptyDesc={t.home.emptyCoursesDesc}
        t={t}
      />

      {/* ============ BEST SELLING ============ */}
      <CourseSection
        id="selling"
        eyebrow={t.home.bestSelling}
        title={t.home.bestSelling}
        href="/courses?sort=popular"
        loading={loading}
        courses={topSelling}
        t={t}
        gradient
      />

      {/* ============ TOP RATED ============ */}
      <CourseSection
        id="rated"
        eyebrow={t.home.topRated}
        title={t.home.topRated}
        href="/courses?sort=rating"
        loading={loading}
        courses={topRated}
        t={t}
      />

      {/* ============ INSTRUCTORS ============ */}
      {instructors.length > 0 && (
        <section className="py-14 md:py-20">
          <div className="container">
            <SectionHeader title={t.home.instructorsTitle} linkText={t.home.viewAll} href="/courses" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {instructors.slice(0, 4).map((inst) => (
                <Link
                  key={inst.id}
                  href={`/courses?instructor=${inst.id}`}
                  className="group flex flex-col items-center rounded-2xl border border-border/70 bg-card p-6 text-center card-hover"
                >
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-white">
                      {inst.fullName?.charAt(0)}
                    </div>
                    {inst.instructorProfile?.isVerified && (
                      <CheckCircle2 className="absolute -bottom-1 -end-1 h-5 w-5 rounded-full bg-card text-cyan-500" />
                    )}
                  </div>
                  <div className="mt-3 font-display text-sm font-bold">{inst.fullName}</div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {inst.instructorProfile?.headline || inst.instructorProfile?.biography?.slice(0, 40) || t.courses.instructor}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-secondary">
                    {inst._count?.courses || 0} {t.home.statsCourses}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ BECOME INSTRUCTOR ============ */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl gradient-primary p-8 text-center text-white md:p-14">
            <div className="pointer-events-none absolute -top-16 -start-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -end-16 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-2xl font-extrabold md:text-4xl">{t.home.becomeInstructor}</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/80">{t.home.becomeInstructorDesc}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 font-semibold text-primary shadow-xl transition-transform hover:-translate-y-0.5"
                >
                  <GraduationCap className="h-5 w-5" />
                  {t.home.startLearning}
                </Link>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 py-3 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  {t.home.browseCourses} <ArrowUpRight className="h-5 w-5 rtl:-scale-x-100" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SUPPORT ============ */}
      <section className="py-14 md:py-20">
        <div className="container">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
              <Headset className="h-4 w-4" /> {t.home.support}
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold md:text-3xl">{t.home.support}</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t.home.supportDesc}</p>
          </div>

          <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
            <a
              href={WHATSAPP_LINK(t.home.whatsappGreeting)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center rounded-2xl border border-green-500/25 bg-card p-7 text-center card-hover"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-transform group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
              >
                <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true">
                  <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.7 6L4 29l8.2-1.6c1.2.6 2.5.9 3.8.9 6.6 0 12-5.4 12-12S22.6 3 16 3zm6.1 16.9c-.3.8-1.5 1.5-2.4 1.7-.6.1-1.4.2-4-.9-3.3-1.4-5.4-4.9-5.6-5.1-.2-.2-1.3-1.8-1.3-3.4s.8-2.4 1.1-2.7c.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5s.9 2.2 1 2.3c0 .2.1.3 0 .5-.1.2-.1.3-.2.5l-.4.5c-.2.2-.4.4-.2.7.2.3 1 1.7 2.2 2.7 1.5 1.3 2.8 1.7 3.2 1.9.4.2.6.2.8-.1s1-1.1 1.3-1.5c.3-.4.5-.3.9-.2s2.3 1.1 2.7 1.3c.4.2.6.3.7.5.1.1.1.7-.1 1.1z" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{t.home.viaWhatsapp}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{SUPPORT_EMAIL.replace(/.*/, '01003677165')}</p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-transform group-hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}>
                {t.home.whatsapp} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </span>
            </a>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="group flex flex-col items-center rounded-2xl border border-border/70 bg-card p-7 text-center card-hover"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary-soft text-secondary transition-transform group-hover:scale-110">
                <Mail className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{t.home.viaEmail}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-xl bg-gradient-primary-soft px-4 py-2 text-sm font-semibold text-secondary transition-colors group-hover:bg-gradient-primary group-hover:text-white">
                {t.home.supportEmail} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </span>
            </a>
          </div>
        </div>
      </section>

      <WhatsAppButton />
    </>
  );
}

/* ================= helpers ================= */

function SectionHeader({ title, linkText, href }: { title: string; linkText: string; href: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="h-8 w-1.5 rounded-full bg-gradient-primary" />
        <h2 className="font-display text-2xl font-extrabold md:text-3xl">{title}</h2>
      </div>
      <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-secondary hover:underline">
        {linkText} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
      </Link>
    </div>
  );
}

function CourseSection({
  id, eyebrow, title, href, loading, courses, emptyTitle, emptyDesc, t, gradient,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href: string;
  loading: boolean;
  courses: Course[];
  emptyTitle?: string;
  emptyDesc?: string;
  t: any;
  gradient?: boolean;
}) {
  return (
    <section id={id} className={`py-14 md:py-20 ${gradient ? 'bg-gradient-primary-soft/50' : ''}`}>
      <div className="container">
        <SectionHeader title={title} linkText={t.home.viewAll} href={href} />
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-video skeleton" />
                <div className="space-y-3 p-4">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
            <div className="text-4xl">🎓</div>
            <h3 className="mt-3 font-display text-lg font-bold">{emptyTitle || t.home.emptyCourses}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDesc || t.home.emptyCoursesDesc}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function StatItem({
  label, value, icon, loading, prefix = '', suffix = '',
}: {
  label: string;
  value?: number;
  icon: React.ReactNode;
  loading?: boolean;
  prefix?: string;
  suffix?: string;
}) {
  const display = useCountUp(value ?? 0, loading);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary-soft text-secondary">
        {icon}
      </div>
      <div>
        {loading ? (
          <div className="skeleton mx-auto h-6 w-16 rounded" />
        ) : (
          <p className="font-display text-2xl font-extrabold gradient-text md:text-3xl">
            {prefix}
            {display.toLocaleString()}
            {suffix}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function useCountUp(target: number, loading?: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (loading) return;
    const duration = 900;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, loading]);
  return value;
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { statsApi, categoryApi, authApi } from '@/lib/api';
import { WhatsAppButton } from '@/components/shared/WhatsAppButton';
import { CourseCard } from '@/components/shared/CourseCard';
import CountUp from '@/components/shared/CountUp';
import {
  Star, Users, ArrowUpRight, Rocket, ShieldCheck,
  Award, FileCheck2, LayoutDashboard, LifeBuoy,
  GraduationCap, BookOpen,
} from 'lucide-react';

type Course = Record<string, any>;
type Category = Record<string, any>;

const FEATURED_COUNT = 8;

export default function HomePage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
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
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/reviews`).then((r) => r.json()),
    ]).then(([s, c, i, r]) => {
      if (s.status === 'fulfilled') setStats(s.value.data);
      if (c.status === 'fulfilled') setCategories(c.value.data || []);
      if (i.status === 'fulfilled') setInstructors(i.value?.data || []);
      if (r.status === 'fulfilled') setReviews(r.value?.data || []);
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

  const featured = useMemo(() => {
    const merged: Course[] = [];
    const seen = new Set<string>();
    [...latest, ...topSelling, ...topRated].forEach((c: Course) => {
      if (c?.id && !seen.has(c.id)) {
        seen.add(c.id);
        merged.push(c);
      }
    });
    return merged.slice(0, FEATURED_COUNT);
  }, [latest, topSelling, topRated]);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b border-border/60 bg-background">
        <div className="pointer-events-none absolute -top-40 start-[10%] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 end-[5%] h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />

        <div className="container relative grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div className="text-center lg:text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary">
              {t.home.heroBadge}
            </span>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.2] text-foreground md:text-5xl lg:text-6xl">
              {t.home.heroTitleStart}
              <span className="text-primary"> {t.home.heroTitleAccent}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg lg:mx-0">
              {t.home.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href={user ? dashboardHref : '/register'}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-[0_10px_28px_-10px_rgba(235,32,39,0.65)] transition-colors hover:bg-secondary"
              >
                {user ? t.nav.dashboard : t.home.subscribeNow}
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-8 py-4 text-base font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {t.home.browseCourses}
                <ArrowUpRight className="h-5 w-5 rtl:-scale-x-100" />
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start">
              <HeroStat label={t.home.statsLabelCourses} value={counts.courses ?? 0} loading={loading} />
              <span className="hidden h-8 w-px bg-border sm:block" />
              <HeroStat label={t.home.statsLabelStudents} value={counts.students ?? 0} loading={loading} />
              <span className="hidden h-8 w-px bg-border sm:block" />
              <HeroStat label={t.home.statsLabelInstructors} value={counts.instructors ?? 0} loading={loading} />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:block">
            {featured[0] && !loading ? (
              <CourseCard course={featured[0]} />
            ) : loading ? (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
                <div className="skeleton aspect-video rounded-xl" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-8 w-8 text-primary" />
                </span>
                <div className="mt-4 font-display text-lg font-bold text-foreground">{t.home.emptyCourses}</div>
                <div className="mt-1 max-w-xs text-sm text-muted-foreground">{t.home.emptyCoursesDesc}</div>
                <Link href="/courses" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary">
                  {t.home.browseCourses} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ CATEGORIES STRIP ============ */}
      {categories.length > 0 && (
        <section className="border-b border-border/60 bg-muted/40 py-6">
          <div className="container flex flex-wrap items-center gap-2">
            <span className="me-1 text-sm font-bold text-foreground">{t.home.allCategories}:</span>
            <Link
              href="/courses"
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {t.common.all}
            </Link>
            {categories.slice(0, 10).map((cat) => (
              <Link
                key={cat.id}
                href={`/courses?category=${cat.id}`}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ FEATURED COURSES ============ */}
      <section id="courses" className="bg-background py-14 md:py-20">
        <div className="container">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">{t.home.featuredCourses}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.home.instructorsDesc}</p>
            </div>
            <Link href="/courses" className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
              {t.home.viewAll} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((course: Course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 py-20 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-foreground">{t.home.emptyCourses}</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{t.home.emptyCoursesDesc}</p>
              <Link
                href={user ? dashboardHref : '/register'}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary"
              >
                {user ? t.nav.dashboard : t.home.subscribeNow}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ============ INSTRUCTORS ============ */}
      {instructors.length > 0 && (
        <section id="instructors" className="border-y border-border/60 bg-muted/40 py-14 md:py-20">
          <div className="container">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">{t.home.instructorsTitle}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{t.home.instructorsDesc}</p>
              </div>
              <Link href="/courses" className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
                {t.home.seeAllInstructors} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {instructors.slice(0, 8).map((inst) => (
                <Link
                  key={inst.id}
                  href={`/courses?instructor=${inst.id}`}
                  className="group flex flex-col items-center rounded-2xl border border-border/70 bg-card px-5 py-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(235,32,39,0.25)]"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-primary/20">
                    {inst.avatarUrl ? (
                      <img src={inst.avatarUrl} alt={inst.fullName} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-2xl font-bold text-primary">
                        {inst.fullName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 font-display text-base font-bold text-foreground">{inst.fullName}</div>
                  <div className="mt-1 line-clamp-2 min-h-8 text-xs text-muted-foreground">
                    {inst.instructorProfile?.headline || t.courses.instructor}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {inst._count?.courses || 0} {t.home.statsCourses}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ SUCCESS STORIES ============ */}
      {reviews.length > 0 && (
        <section id="reviews" className="bg-background py-14 md:py-20">
          <div className="container">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">{t.home.reviewsTitle}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.home.reviewsSubtitle}</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r) => (
                <div key={r.id} className="flex flex-col rounded-2xl border border-border/70 bg-card p-6">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className={`h-4 w-4 ${s < r.rating ? 'fill-current' : 'opacity-25'}`} />
                    ))}
                  </div>
                  <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-foreground/80">
                    “{r.comment || '—'}”
                  </p>
                  <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {r.student?.fullName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{r.student?.fullName}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.course?.titleAr || r.course?.title}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ WHY NUVEXA ============ */}
      <section className="border-t border-border/60 bg-background py-14 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">{t.home.whyTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.home.whySubtitle}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <WhyCard icon={<Rocket className="h-5 w-5" />} title={t.home.whySpeed} desc={t.home.whySpeedDesc} />
            <WhyCard icon={<ShieldCheck className="h-5 w-5" />} title={t.home.whyQuality} desc={t.home.whyQualityDesc} />
            <WhyCard icon={<Award className="h-5 w-5" />} title={t.home.whyCertificates} desc={t.home.whyCertificatesDesc} />
            <WhyCard icon={<FileCheck2 className="h-5 w-5" />} title={t.home.whyExams} desc={t.home.whyExamsDesc} />
            <WhyCard icon={<LayoutDashboard className="h-5 w-5" />} title={t.home.whyFollowup} desc={t.home.whyFollowupDesc} />
            <WhyCard icon={<LifeBuoy className="h-5 w-5" />} title={t.home.whySupport} desc={t.home.whySupportDesc} />
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="bg-background pb-4">
        <div className="container">
          <div className="relative overflow-hidden rounded-[28px] gradient-primary p-8 text-center text-white md:p-14">
            <div className="pointer-events-none absolute -top-24 start-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 end-1/4 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-3xl font-extrabold md:text-4xl">{t.home.ctaTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/85">{t.home.ctaDesc}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href={user ? dashboardHref : '/register'}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold text-primary transition-transform hover:-translate-y-0.5"
                >
                  {user ? t.nav.dashboard : t.home.subscribeNow}
                </Link>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-3.5 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  <BookOpen className="h-5 w-5" />
                  {t.home.browseCourses}
                </Link>
              </div>
              <div className="mx-auto mt-8 flex max-w-lg flex-wrap items-center justify-center gap-x-8 gap-y-3">
                <div className="text-center">
                  <div className="font-display text-2xl font-extrabold"><CountUp to={counts.courses ?? 0} /></div>
                  <div className="text-xs text-white/80">{t.home.statsLabelCourses}</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-2xl font-extrabold"><CountUp to={counts.students ?? 0} /></div>
                  <div className="text-xs text-white/80">{t.home.statsLabelStudents}</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-2xl font-extrabold"><CountUp to={counts.instructors ?? 0} /></div>
                  <div className="text-xs text-white/80">{t.home.statsLabelInstructors}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WhatsAppButton />
    </>
  );
}

/* ================= helpers ================= */

function HeroStat({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <div className="text-center lg:text-start">
      {loading ? (
        <div className="skeleton mx-auto h-6 w-14 rounded lg:mx-0" />
      ) : (
        <div className="font-display text-xl font-extrabold text-foreground">
          <CountUp to={value} />
        </div>
      )}
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function WhyCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group h-full rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(235,32,39,0.2)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

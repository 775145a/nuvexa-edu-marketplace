'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { statsApi, categoryApi, authApi, WHATSAPP_LINK } from '@/lib/api';
import { WhatsAppButton } from '@/components/shared/WhatsAppButton';
import { LogoMark } from '@/components/shared/Logo';
import CountUp from '@/components/shared/CountUp';
import {
  Star, Users, Clock, Search, ArrowUpRight, Rocket, ShieldCheck,
  Award, FileCheck2, LayoutDashboard, LifeBuoy, Headset, Mail,
  GraduationCap, BookOpen, Quote, TrendingUp, PlayCircle,
} from 'lucide-react';

type Course = Record<string, any>;
type Category = Record<string, any>;

const SUPPORT_EMAIL = 'almisriualqaysar@gmail.com';

const COURSE_TABS = ['latest', 'selling', 'rated'] as const;

function formatDuration(minutes: number | null | undefined, hoursLabel: string, minutesLabel: string): string {
  const m = Math.round(minutes ?? 0);
  if (m <= 0) return '';
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0 && rem > 0) return `${h} ${hoursLabel} ${rem} ${minutesLabel}`;
  if (h > 0) return `${h} ${hoursLabel}`;
  return `${rem} ${minutesLabel}`;
}

export default function HomePage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [courseTab, setCourseTab] = useState<'latest' | 'selling' | 'rated'>('latest');
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

  const tabCourses = useMemo(() => {
    if (courseTab === 'selling') return topSelling;
    if (courseTab === 'rated') return topRated;
    return latest;
  }, [courseTab, latest, topSelling, topRated]);

  const popularTags = [
    t.home.tagProgramming, t.home.tagAI, t.home.tagBusiness,
    t.home.tagDesign, t.home.tagEnglish, t.home.tagCyber,
  ];

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/courses?search=${encodeURIComponent(q)}`);
  };

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="border-b border-border/60 bg-background">
        <div className="container grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-20">
          <div className="text-center lg:text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary">
              <LogoMark size={20} />
              {t.home.heroBadge}
            </span>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.2] text-foreground md:text-6xl">
              {t.home.heroTitleStart}
              <span className="text-primary"> {t.home.heroTitleAccent}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg lg:mx-0">
              {t.home.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-[0_10px_28px_-10px_rgba(124,58,237,0.65)] transition-colors hover:bg-secondary"
              >
                <PlayCircle className="h-5 w-5" />
                {t.home.browseCourses}
              </Link>
              <Link
                href={user ? dashboardHref : '/register'}
                className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-4 text-base font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {user ? t.nav.dashboard : t.home.joinNow}
                <ArrowUpRight className="h-5 w-5 rtl:-scale-x-100" />
              </Link>
            </div>

            <form onSubmit={submitSearch} className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-full border border-border bg-card p-1.5 pe-2 shadow-sm transition-all focus-within:border-primary/50 lg:mx-0">
              <Search className="ms-3 h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.home.searchPlaceholder}
                className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary">
                {t.home.searchCta}
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start">
              <HeroStat label={t.home.statsLabelCourses} value={counts.courses ?? 0} loading={loading} />
              <span className="hidden h-8 w-px bg-border sm:block" />
              <HeroStat label={t.home.statsLabelStudents} value={counts.students ?? 0} loading={loading} />
              <span className="hidden h-8 w-px bg-border sm:block" />
              <HeroStat label={t.home.statsLabelInstructors} value={counts.instructors ?? 0} loading={loading} />
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-lg lg:block">
            <HeroVisual t={t} latestCourse={latest[0]} loading={loading} />
          </div>
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      <section id="categories" className="border-b border-border/60 bg-background py-12 md:py-16">
        <div className="container">
          <SectionHeader title={t.home.allCategories} linkText={t.home.viewAll} href="/categories" />
          {categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
              {categories.slice(0, 8).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/courses?category=${cat.id}`}
                  className="group flex flex-col items-center rounded-2xl border border-border bg-card px-3 py-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_32px_-16px_rgba(124,58,237,0.35)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl transition-transform duration-300 group-hover:scale-110">
                    {cat.icon || '📚'}
                  </span>
                  <span className="mt-3 line-clamp-1 text-sm font-bold text-foreground">
                    {locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {cat._count?.courses || 0} {t.home.statsCourses}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4">
                  <div className="skeleton mx-auto h-12 w-12 rounded-full" />
                  <div className="skeleton mx-auto mt-3 h-4 w-2/3" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ COURSES (tabs) ============ */}
      <section id="courses" className="bg-background py-12 md:py-16">
        <div className="container">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-foreground md:text-4xl">{t.home.featuredCourses}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.home.instructorsDesc}</p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
              {COURSE_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCourseTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    courseTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'latest' && t.home.latestCourses}
                  {tab === 'selling' && t.home.bestSelling}
                  {tab === 'rated' && t.home.topRated}
                </button>
              ))}
            </div>
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
          ) : tabCourses.length > 0 ? (
            <div key={courseTab} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {tabCourses.map((course: Course) => (
                <HomeCourseCard key={course.id} course={course} t={t} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
              <div className="text-4xl">🎓</div>
              <h3 className="mt-3 font-display text-lg font-bold">{t.home.emptyCourses}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.home.emptyCoursesDesc}</p>
            </div>
          )}
        </div>
      </section>

      {/* ============ INSTRUCTORS ============ */}
      {instructors.length > 0 && (
        <section id="instructors" className="border-y border-border/60 bg-muted/40 py-12 md:py-16">
          <div className="container">
            <SectionHeader title={t.home.instructorsTitle} linkText={t.home.seeAllInstructors} href="/courses" />
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {instructors.slice(0, 8).map((inst) => (
                <Link
                  key={inst.id}
                  href={`/courses?instructor=${inst.id}`}
                  className="group flex flex-col items-center rounded-2xl border border-border bg-card px-5 py-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_32px_-16px_rgba(124,58,237,0.35)]"
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
                  <div className="mt-4 font-display text-base font-bold">{inst.fullName}</div>
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

      {/* ============ REVIEWS ============ */}
      {reviews.length > 0 && (
        <section className="bg-background py-12 md:py-16">
          <div className="container">
            <SectionHeader title={t.home.reviewsTitle} linkText={t.home.viewAll} href="/courses" />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r) => (
                <div key={r.id} className="flex flex-col rounded-2xl border border-border bg-card p-6">
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
      <section className="border-t border-border/60 bg-background py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-extrabold text-foreground md:text-4xl">{t.home.whyTitle}</h2>
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
            <div className="pointer-events-none absolute -bottom-28 end-1/4 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-3xl font-extrabold md:text-4xl">{t.home.ctaTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/85">{t.home.ctaDesc}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href={user ? dashboardHref : '/register'}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold text-primary transition-transform hover:-translate-y-0.5"
                >
                  {user ? t.nav.dashboard : t.home.joinNow}
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

      {/* ============ SUPPORT ============ */}
      <section id="contact" className="bg-background py-12 md:py-16">
        <div className="container">
          <div className="text-center">
            <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">{t.home.support}</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t.home.supportDesc}</p>
          </div>
          <div className="mx-auto mt-8 grid max-w-2xl gap-5 sm:grid-cols-2">
            <a
              href={WHATSAPP_LINK(t.home.whatsappGreeting)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform group-hover:scale-110" style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}>
                <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true">
                  <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.7 6L4 29l8.2-1.6c1.2.6 2.5.9 3.8.9 6.6 0 12-5.4 12-12S22.6 3 16 3zm6.1 16.9c-.3.8-1.5 1.5-2.4 1.7-.6.1-1.4.2-4-.9-3.3-1.4-5.4-4.9-5.6-5.1-.2-.2-1.3-1.8-1.3-3.4s.8-2.4 1.1-2.7c.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5s.9 2.2 1 2.3c0 .2.1.3 0 .5-.1.2-.1.3-.2.5l-.4.5c-.2.2-.4.4-.2.7.2.3 1 1.7 2.2 2.7 1.5 1.3 2.8 1.7 3.2 1.9.4.2.6.2.8-.1s1-1.1 1.3-1.5c.3-.4.5-.3.9-.2s2.3 1.1 2.7 1.3c.4.2.6.3.7.5.1.1.1.7-.1 1.1z" />
                </svg>
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{t.home.viaWhatsapp}</h3>
              <p className="mt-1 text-xs text-muted-foreground">01003677165</p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-secondary">
                {t.home.whatsapp} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </span>
            </a>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="group flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Mail className="h-7 w-7" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{t.home.viaEmail}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-secondary">
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

function HeroVisual({ t, latestCourse, loading }: { t: any; latestCourse: any; loading?: boolean }) {
  const course = latestCourse || null;
  const price = course?.discountedPrice ?? course?.price;
  const title = course ? (course.titleAr || course.title) : '';
  const category = course ? (course.category?.nameAr || course.category?.name) : '';

  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[48px] bg-primary/10 blur-3xl" aria-hidden="true" />

      {course ? (
        <Link
          href={`/courses/${course.slug}`}
          className="group block overflow-hidden rounded-3xl border border-border bg-card shadow-[0_32px_64px_-32px_rgba(76,29,149,0.35)] transition-all duration-300 hover:-translate-y-1"
        >
          <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">📖</div>
            )}
            {category && (
              <span className="absolute bottom-3 start-3 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {category}
              </span>
            )}
          </div>
          <div className="p-5">
            <div className="line-clamp-1 font-display text-base font-bold text-foreground">{title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{course.instructor?.fullName}</div>
            <div className="mt-3 flex items-center gap-3">
              {course.averageRating > 0 && (
                <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  {course.averageRating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {(course.enrollmentCount || course._count?.enrollments || 0).toLocaleString()}
              </span>
              <span className="ms-auto font-display text-base font-extrabold text-primary">
                {price === 0 ? t.courses.free : `${Number(price ?? 0).toLocaleString()} ${course.currency || 'EGP'}`}
              </span>
            </div>
          </div>
        </Link>
      ) : loading ? (
        <div className="space-y-3 rounded-3xl border border-border bg-card p-3">
          <div className="skeleton aspect-video rounded-2xl" />
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <LogoMark size={40} />
          <div className="mt-4 font-display text-base font-bold">{t.home.comingSoon}</div>
          <Link href="/courses" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary">
            {t.home.browseCourses} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </div>
      )}
    </div>
  );
}

function HomeCourseCard({ course, t, locale }: { course: Course; t: any; locale: string }) {
  const title = locale === 'ar' ? (course.titleAr || course.title) : course.title;
  const category = locale === 'ar' ? (course.category?.nameAr || course.category?.name) : course.category?.name;
  const price = course.discountedPrice ?? course.price;
  const hasDiscount = course.discountedPrice && course.discountedPrice < course.price;
  const rating = course.averageRating || 0;
  const students = course.enrollmentCount || course._count?.enrollments || 0;
  const duration = course.totalDuration || course.duration;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_48px_-24px_rgba(124,58,237,0.4)]"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/15 to-accent/15">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">📖</div>
        )}
        {category && (
          <span className="absolute top-3 start-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur">
            {category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.6rem] font-display text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>

        <p className="mt-1.5 text-xs text-muted-foreground">{course.instructor?.fullName}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1 font-semibold text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current" />
            {rating > 0 ? rating.toFixed(1) : t.courses.newest}
          </span>
          <span className="text-muted-foreground">
            ({course._count?.reviews ?? 0} {t.courses.reviews})
          </span>
          <span className="ms-auto flex items-center gap-1 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {students.toLocaleString()}
          </span>
        </div>

        {duration > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(duration, t.courses.hours, t.courses.minutes)}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex items-baseline gap-1.5">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">{`${Number(course.price).toLocaleString()} ${course.currency || 'EGP'}`}</span>
            )}
            <span className="font-display text-base font-extrabold text-foreground">
              {course.price === 0 ? t.courses.free : `${Number(price ?? 0).toLocaleString()} ${course.currency || 'EGP'}`}
            </span>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroStat({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div>
        {loading ? (
          <div className="skeleton h-6 w-14 rounded" />
        ) : (
          <div className="font-display text-xl font-extrabold text-foreground">
            <CountUp to={value} />
          </div>
        )}
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function WhyCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function SectionHeader({ title, linkText, href }: { title: string; linkText: string; href: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">{title}</h2>
      <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
        {linkText} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
      </Link>
    </div>
  );
}

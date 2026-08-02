'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { statsApi, categoryApi, authApi, WHATSAPP_LINK } from '@/lib/api';
import { CourseCard } from '@/components/shared/CourseCard';
import { WhatsAppButton } from '@/components/shared/WhatsAppButton';
import { LogoMark } from '@/components/shared/Logo';
import Reveal from '@/components/shared/Reveal';
import CountUp from '@/components/shared/CountUp';
import {
  PlayCircle, BookOpen, GraduationCap, Users, ShoppingBag,
  Mail, ArrowUpRight, ArrowDown, Headset, CheckCircle2,
  Search, Sparkles, Rocket, Award, FileCheck2, LayoutDashboard,
  LifeBuoy, Star, Quote, ShieldCheck, TrendingUp,
} from 'lucide-react';

type Course = Record<string, any>;
type Category = Record<string, any>;

const SUPPORT_EMAIL = 'almisriualqaysar@gmail.com';

const CATEGORY_STYLES = [
  { gradient: 'from-blue-500 via-indigo-500 to-violet-500', soft: 'bg-blue-500/10 text-blue-600' },
  { gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', soft: 'bg-violet-500/10 text-violet-600' },
  { gradient: 'from-cyan-500 via-sky-500 to-blue-500', soft: 'bg-cyan-500/10 text-cyan-600' },
  { gradient: 'from-emerald-500 via-teal-500 to-cyan-500', soft: 'bg-emerald-500/10 text-emerald-600' },
  { gradient: 'from-amber-500 via-orange-500 to-rose-500', soft: 'bg-amber-500/10 text-amber-600' },
  { gradient: 'from-rose-500 via-pink-500 to-fuchsia-500', soft: 'bg-rose-500/10 text-rose-600' },
  { gradient: 'from-indigo-500 via-blue-500 to-cyan-500', soft: 'bg-indigo-500/10 text-indigo-600' },
  { gradient: 'from-teal-500 via-emerald-500 to-green-500', soft: 'bg-teal-500/10 text-teal-600' },
];

const COURSE_TABS = ['latest', 'selling', 'rated'] as const;

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

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#selling' || hash === '#rated') {
      setCourseTab(hash.slice(1) as any);
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
      <section className="relative overflow-hidden pt-10 md:pt-16">
        <div className="grid-bg absolute inset-0" />
        <div className="blob start-[8%] top-[-10%] h-[420px] w-[420px] bg-blue-400/60" />
        <div className="blob end-[-5%] top-[5%] h-[380px] w-[380px] bg-violet-400/60" style={{ animationDelay: '-6s' }} />
        <div className="blob start-[30%] top-[45%] h-[360px] w-[360px] bg-cyan-300/50" style={{ animationDelay: '-12s' }} />

        <div className="container relative grid items-center gap-12 py-12 lg:grid-cols-2 lg:py-20">
          <div className="text-center lg:text-start">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-4 py-1.5 text-sm font-semibold text-primary shadow-soft backdrop-blur"
            >
              <LogoMark size={20} />
              {t.home.heroBadge}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 font-display text-4xl font-extrabold leading-[1.15] text-foreground md:text-6xl"
            >
              {t.home.heroTitle.split(' ').slice(0, 2).join(' ')}{' '}
              <span className="logo-gradient-text">{t.home.heroTitle.split(' ').slice(2).join(' ')}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-xl lg:mx-0"
            >
              {t.home.heroSubtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
            >
              <Link
                href={dashboardHref}
                className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-lg font-semibold text-white"
              >
                <PlayCircle className="h-5 w-5" />
                {user ? t.nav.dashboard : t.home.startLearning}
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white/70 px-8 py-4 text-lg font-semibold text-foreground shadow-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <BookOpen className="h-5 w-5 text-primary" />
                {t.home.browseCourses}
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start"
            >
              <HeroStat label={t.home.statsLabelCourses} value={counts.courses ?? 0} icon={<BookOpen className="h-4 w-4" />} loading={loading} />
              <HeroStat label={t.home.statsLabelStudents} value={counts.students ?? 0} icon={<Users className="h-4 w-4" />} loading={loading} />
              <HeroStat label={t.home.statsLabelInstructors} value={counts.instructors ?? 0} icon={<GraduationCap className="h-4 w-4" />} loading={loading} />
            </motion.div>
          </div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto hidden w-full max-w-lg lg:block"
          >
            <HeroVisual t={t} counts={counts} latestCourse={latest[0]} loading={loading} />
          </motion.div>
        </div>
      </section>

      {/* ============ SEARCH ============ */}
      <section className="relative z-10 px-4 pb-4 pt-4">
        <div className="container">
          <Reveal>
            <div className="glass-card relative -mt-4 rounded-[28px] p-6 shadow-[0_24px_60px_-24px_rgba(37,99,235,0.25)] md:p-10">
              <div className="pointer-events-none absolute -top-10 start-1/4 h-28 w-64 rounded-full bg-blue-400/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 end-1/4 h-28 w-64 rounded-full bg-violet-400/20 blur-3xl" />
              <div className="relative text-center">
                <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">
                  <span className="inline-flex items-center gap-2">
                    <Search className="h-6 w-6 text-primary" />
                    {t.home.searchTitle}
                  </span>
                </h2>

                <form onSubmit={submitSearch} className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.home.searchPlaceholder}
                    className="h-14 flex-1 rounded-2xl border border-border bg-background px-5 text-base outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                  />
                  <button type="submit" className="btn-gradient inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-8 text-base font-semibold text-white">
                    <Search className="h-5 w-5" />
                    {t.home.searchCta}
                  </button>
                </form>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t.home.popularTags}</span>
                  {popularTags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/courses?search=${encodeURIComponent(tag)}`}
                      className="rounded-full border border-border bg-background px-3.5 py-1.5 font-medium text-foreground/80 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      <section id="categories" className="py-14 md:py-20">
        <div className="container">
          <Reveal><SectionHeader title={t.home.allCategories} linkText={t.home.viewAll} href="/categories" /></Reveal>
          {categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {categories.slice(0, 8).map((cat, i) => {
                const style = CATEGORY_STYLES[i % CATEGORY_STYLES.length];
                return (
                  <Reveal key={cat.id} delay={(i % 4) * 0.06}>
                    <Link
                      href={`/courses?category=${cat.id}`}
                      className="group relative block overflow-hidden rounded-[24px] border border-border/70 bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card md:p-6"
                    >
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]`} />
                      <div className={`pointer-events-none absolute -end-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${style.gradient} opacity-[0.14] blur-xl transition-all duration-300 group-hover:opacity-30 group-hover:scale-125`} />
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary-soft text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                        {cat.icon || '📚'}
                      </div>
                      <div className="relative mt-4 font-display text-base font-bold md:text-lg">
                        {locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}
                      </div>
                      <div className="relative mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {cat._count?.courses || 0} {t.home.statsCourses}
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-[24px] border border-border bg-card p-5">
                  <div className="skeleton h-14 w-14 rounded-2xl" />
                  <div className="skeleton mt-4 h-5 w-2/3" />
                  <div className="skeleton mt-2 h-3 w-1/3" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ COURSES (tabs) ============ */}
      <section id="courses" className="py-10 md:py-16">
        <div className="container">
          <Reveal>
            <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div className="flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full bg-gradient-primary" />
                <div>
                  <h2 className="font-display text-2xl font-extrabold md:text-3xl">{t.home.featuredCourses}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t.home.instructorsDesc}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1.5">
                {COURSE_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCourseTab(tab)}
                    className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      courseTab === tab ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {courseTab === tab && (
                      <motion.span
                        layoutId="courseTabPill"
                        className="absolute inset-0 rounded-xl bg-gradient-primary"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative">
                      {tab === 'latest' && t.home.latestCourses}
                      {tab === 'selling' && t.home.bestSelling}
                      {tab === 'rated' && t.home.topRated}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="overflow-hidden rounded-[24px] border border-border bg-card">
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
            <motion.div key={courseTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {tabCourses.map((course: Course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </motion.div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-card/50 py-16 text-center">
              <div className="text-4xl">🎓</div>
              <h3 className="mt-3 font-display text-lg font-bold">{t.home.emptyCourses}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.home.emptyCoursesDesc}</p>
            </div>
          )}
        </div>
      </section>

      {/* ============ INSTRUCTORS ============ */}
      {instructors.length > 0 && (
        <section id="instructors" className="bg-gradient-primary-soft/40 py-14 md:py-20">
          <div className="container">
            <Reveal><SectionHeader title={t.home.instructorsTitle} linkText={t.home.seeAllInstructors} href="/courses" /></Reveal>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {instructors.slice(0, 4).map((inst, i) => (
                <Reveal key={inst.id} delay={i * 0.08}>
                  <Link
                    href={`/courses?instructor=${inst.id}`}
                    className="group flex flex-col items-center rounded-[24px] border border-border/70 bg-card p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card"
                  >
                    <div className="relative">
                      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gradient-primary p-[3px]">
                        {inst.avatarUrl ? (
                          <img src={inst.avatarUrl} alt={inst.fullName} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-2xl font-bold text-primary">
                            {inst.fullName?.charAt(0)}
                          </div>
                        )}
                      </div>
                      {inst.instructorProfile?.isVerified && (
                        <CheckCircle2 className="absolute -bottom-1 -end-1 h-6 w-6 rounded-full bg-white p-0.5 text-cyan-500 shadow-soft" />
                      )}
                    </div>
                    <div className="mt-4 font-display text-base font-bold">{inst.fullName}</div>
                    <div className="mt-1 line-clamp-2 min-h-8 text-xs text-muted-foreground">
                      {inst.instructorProfile?.headline || inst.instructorProfile?.biography?.slice(0, 60) || t.courses.instructor}
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {inst._count?.courses || 0} {t.home.statsCourses}
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ WHY NUVEXA ============ */}
      <section className="py-14 md:py-20">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
              <Sparkles className="h-4 w-4" /> Nuvexa
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold md:text-4xl">{t.home.whyTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.home.whySubtitle}</p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <WhyCard icon={<Rocket className="h-6 w-6" />} title={t.home.whySpeed} desc={t.home.whySpeedDesc} tone="blue" />
            <WhyCard icon={<ShieldCheck className="h-6 w-6" />} title={t.home.whyQuality} desc={t.home.whyQualityDesc} tone="violet" />
            <WhyCard icon={<Award className="h-6 w-6" />} title={t.home.whyCertificates} desc={t.home.whyCertificatesDesc} tone="cyan" />
            <WhyCard icon={<FileCheck2 className="h-6 w-6" />} title={t.home.whyExams} desc={t.home.whyExamsDesc} tone="emerald" />
            <WhyCard icon={<LayoutDashboard className="h-6 w-6" />} title={t.home.whyFollowup} desc={t.home.whyFollowupDesc} tone="amber" />
            <WhyCard icon={<LifeBuoy className="h-6 w-6" />} title={t.home.whySupport} desc={t.home.whySupportDesc} tone="rose" />
          </div>
        </div>
      </section>

      {/* ============ REVIEWS ============ */}
      <section className="py-14 md:py-20">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary">
              <Star className="h-4 w-4 fill-current" /> {t.home.reviewsTitle}
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold md:text-4xl">{t.home.reviewsTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.home.reviewsSubtitle}</p>
          </Reveal>

          {reviews.length > 0 ? (
            <div className="relative mt-10 overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-background to-transparent rtl:bg-gradient-to-l" />
              <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-background to-transparent rtl:bg-gradient-to-r" />
              <div className="flex w-max gap-5 marquee-track">
                {[...reviews, ...reviews].map((r, i) => (
                  <div key={`${r.id}-${i}`} className="w-[340px] shrink-0 rounded-[24px] border border-border/70 bg-card p-6 shadow-soft">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, s) => (
                        <Star key={s} className={`h-4 w-4 ${s < r.rating ? 'fill-current' : 'opacity-25'}`} />
                      ))}
                    </div>
                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-foreground/80">“{r.comment || '—'}”</p>
                    <div className="mt-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white">
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
          ) : (
            <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-dashed border-border bg-card/50 py-12 text-center">
              <Quote className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">{t.home.emptyCoursesDesc}</p>
            </div>
          )}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-10 md:py-16">
        <div className="container">
          <Reveal>
            <div className="relative overflow-hidden rounded-[28px] gradient-primary p-8 text-center text-white shadow-hero md:p-16">
              <div className="pointer-events-none absolute -top-20 start-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 end-1/4 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl" />
              <div className="pointer-events-none absolute top-0 start-0 h-full w-1/2 bg-gradient-to-r from-white/[0.07] to-transparent" />
              <div className="relative">
                <h2 className="font-display text-3xl font-extrabold md:text-5xl">{t.home.ctaTitle}</h2>
                <p className="mx-auto mt-4 max-w-xl text-white/85">{t.home.ctaDesc}</p>
                <div className="mt-9 flex flex-wrap justify-center gap-4">
                  <Link
                    href={dashboardHref}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-primary shadow-xl transition-transform hover:-translate-y-0.5"
                  >
                    {user ? t.nav.dashboard : t.home.joinNow}
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                  >
                    <GraduationCap className="h-5 w-5" />
                    {t.home.becomeInstructorCta}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ SUPPORT ============ */}
      <section id="contact" className="py-14 md:py-20">
        <div className="container">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
              <Headset className="h-4 w-4" /> {t.home.support}
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold md:text-3xl">{t.home.support}</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t.home.supportDesc}</p>
          </Reveal>

          <div className="mx-auto mt-8 grid max-w-2xl gap-5 sm:grid-cols-2">
            <a
              href={WHATSAPP_LINK(t.home.whatsappGreeting)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center rounded-[24px] border border-green-500/25 bg-card p-8 text-center shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-transform group-hover:scale-110" style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}>
                <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true">
                  <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.7 6L4 29l8.2-1.6c1.2.6 2.5.9 3.8.9 6.6 0 12-5.4 12-12S22.6 3 16 3zm6.1 16.9c-.3.8-1.5 1.5-2.4 1.7-.6.1-1.4.2-4-.9-3.3-1.4-5.4-4.9-5.6-5.1-.2-.2-1.3-1.8-1.3-3.4s.8-2.4 1.1-2.7c.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5s.9 2.2 1 2.3c0 .2.1.3 0 .5-.1.2-.1.3-.2.5l-.4.5c-.2.2-.4.4-.2.7.2.3 1 1.7 2.2 2.7 1.5 1.3 2.8 1.7 3.2 1.9.4.2.6.2.8-.1s1-1.1 1.3-1.5c.3-.4.5-.3.9-.2s2.3 1.1 2.7 1.3c.4.2.6.3.7.5.1.1.1.7-.1 1.1z" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{t.home.viaWhatsapp}</h3>
              <p className="mt-1 text-xs text-muted-foreground">01003677165</p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-transform group-hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}>
                {t.home.whatsapp} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </span>
            </a>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="group flex flex-col items-center rounded-[24px] border border-border/70 bg-card p-8 text-center shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
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

function HeroVisual({ t, counts, latestCourse, loading }: { t: any; counts: any; latestCourse: any; loading?: boolean }) {
  const course = latestCourse || null;
  const price = course?.discountedPrice ?? course?.price;
  const title = course ? (course.titleAr || course.title) : '';
  const instructor = course?.instructor?.fullName || '';

  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-primary-soft blur-2xl" />

      {/* Main panel */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-hero"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="font-display text-sm font-bold text-foreground">Nuvexa</span>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            {t.home.dashboardPreview}
          </span>
        </div>

        <div className="p-5">
          {course ? (
            <Link
              href={`/courses/${course.slug}`}
              className="group block overflow-hidden rounded-2xl border border-border/60 shadow-soft transition-all duration-300 hover:shadow-card"
            >
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
                {course.thumbnailUrl ? (
                  <img src={course.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl">📖</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                <span className="absolute bottom-3 start-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  {course.category?.nameAr || course.category?.name}
                </span>
              </div>
              <div className="p-4">
                <div className="line-clamp-1 font-display text-sm font-bold text-foreground">{title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{instructor}</div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-display text-base font-extrabold gradient-text">
                    {price === 0 ? t.courses.free : `${Number(price ?? 0).toLocaleString()} ${course.currency || 'EGP'}`}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors group-hover:brightness-105">
                    {t.home.startNow} <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" />
                  </span>
                </div>
              </div>
            </Link>
          ) : loading ? (
            <div className="space-y-3">
              <div className="skeleton aspect-video rounded-2xl" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-slate-50 px-5 py-8 text-center">
              <LogoMark size={34} className="mx-auto" />
              <div className="mt-3 font-display text-sm font-bold text-foreground">{t.home.comingSoon}</div>
              <div className="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">{t.home.comingSoonDesc}</div>
              <Link href="/courses" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5">
                {t.home.browseCourses} <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </Link>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <VisualStat value={counts?.courses ?? 0} label={t.home.statsLabelCourses} icon={<BookOpen className="h-4 w-4" />} loading={loading} />
            <VisualStat value={counts?.students ?? 0} label={t.home.statsLabelStudents} icon={<Users className="h-4 w-4" />} loading={loading} />
            <VisualStat value={counts?.instructors ?? 0} label={t.home.statsLabelInstructors} icon={<GraduationCap className="h-4 w-4" />} loading={loading} />
          </div>
        </div>
      </motion.div>

      {/* Exams chip */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        className="absolute -end-4 top-8 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-hero backdrop-blur"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600">
          <FileCheck2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-foreground">{t.home.examsChip}</div>
          <div className="text-[11px] text-muted-foreground">{t.home.whyExamsDesc}</div>
        </div>
      </motion.div>

      {/* Support chip */}
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
        className="absolute -start-5 bottom-20 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-hero backdrop-blur"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600">
          <Headset className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-foreground">{t.home.supportChip}</div>
          <div className="text-[11px] text-muted-foreground">{t.home.whySupportDesc}</div>
        </div>
      </motion.div>
    </div>
  );
}

function VisualStat({ value, label, icon, loading }: { value: number; label: string; icon: React.ReactNode; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-slate-50/70 px-2.5 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-primary">
        {icon}
        {loading ? (
          <div className="skeleton h-4 w-8 rounded" />
        ) : (
          <span className="font-display text-base font-extrabold text-foreground">
            <CountUp to={value} />
          </span>
        )}
      </div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function HeroStat({ label, value, icon, loading }: { label: string; value: number; icon: React.ReactNode; loading?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        {loading ? (
          <div className="skeleton h-5 w-12 rounded" />
        ) : (
          <div className="font-display text-lg font-extrabold">
            <CountUp to={value} />
          </div>
        )}
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function WhyCard({ icon, title, desc, tone }: { icon: React.ReactNode; title: string; desc: string; tone: string }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600',
    violet: 'bg-violet-500/10 text-violet-600',
    cyan: 'bg-cyan-500/10 text-cyan-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    rose: 'bg-rose-500/10 text-rose-600',
  };
  return (
    <Reveal>
      <div className="group h-full rounded-[24px] border border-border/70 bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tones[tone]} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
          {icon}
        </div>
        <h3 className="mt-5 font-display text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </Reveal>
  );
}

function SectionHeader({ title, linkText, href }: { title: string; linkText: string; href: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="h-8 w-1.5 rounded-full bg-gradient-primary" />
        <h2 className="font-display text-2xl font-extrabold md:text-3xl">{title}</h2>
      </div>
      <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-secondary hover:underline">
        {linkText} <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5 rtl:-scale-y-100" />
      </Link>
    </div>
  );
}

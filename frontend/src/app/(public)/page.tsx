'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { courseApi, categoryApi, authApi } from '@/lib/api';
import { Mail, PlayCircle, BookOpen, GraduationCap, Headset, ArrowUpRight } from 'lucide-react';

type Course = Record<string, any>;
type Category = Record<string, any>;

const SUPPORT_EMAIL = 'almisriualqaysar@gmail.com';

export default function HomePage() {
  const { t, locale } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [totalCourses, setTotalCourses] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      courseApi.list({ limit: '8', sort: 'newest' }),
      categoryApi.list(),
    ]).then(([coursesRes, catRes]) => {
      setCourses(coursesRes.data || []);
      setTotalCourses((coursesRes as any).total || 0);
      setCategories(catRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
      authApi.me().then(r => setUser(r.data)).catch(() => {});
    }
  }, []);

  const dashboardHref = user
    ? user.role === 'ADMIN' ? '/admin/dashboard'
      : user.role === 'INSTRUCTOR' ? '/instructor/dashboard'
        : '/student/dashboard'
        : '/register';

  return (
    <>
      {/* Hero */}
      <section className="gradient-hero text-white relative overflow-hidden">
        <div className="container py-20 md:py-32 text-center relative z-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-sm font-medium backdrop-blur mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            {t.home.trustedBadge}
          </span>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">
            {t.home.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
            {t.home.heroSubtitle}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href={dashboardHref}
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl gradient-primary text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <PlayCircle className="h-5 w-5" />
              {user ? t.nav.dashboard : t.home.startLearning}
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/20 text-white font-semibold text-lg hover:bg-white/10 transition-colors backdrop-blur"
            >
              <BookOpen className="h-5 w-5" />
              {t.home.browseCourses}
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <Stat label={`${totalCourses}+`} value={t.home.statsCourses} />
            <Stat label={`${categories.length}+`} value={t.home.statsCategories} />
            <Stat label="24/7" value={t.home.statsSupport} />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-sm font-semibold text-secondary mb-1">{t.nav.categories}</p>
              <h2 className="text-2xl md:text-3xl font-display font-bold">{t.home.allCategories}</h2>
            </div>
            <Link href="/categories" className="inline-flex items-center gap-1 text-sm text-primary hover:underline shrink-0">
              {t.home.browseCourses} <ArrowUpRight className="h-4 w-4 rtl:rotate-90" />
            </Link>
          </div>
          {categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.slice(0, 8).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/courses?category=${cat.id}`}
                  className="group p-4 rounded-xl border border-border bg-card hover:shadow-md hover:-translate-y-0.5 hover:border-secondary/40 transition-all text-center"
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{cat.icon || '📚'}</div>
                  <div className="font-medium text-sm">{locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}</div>
                  <div className="text-xs text-muted-foreground">{cat._count?.courses || 0} {t.home.statsCourses}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card"><div className="skeleton h-16" /></div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-sm font-semibold text-secondary mb-1">{t.home.featuredCourses}</p>
              <h2 className="text-2xl md:text-3xl font-display font-bold">{t.courses.explore}</h2>
            </div>
            <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-primary hover:underline shrink-0">
              {t.home.browseCourses} <ArrowUpRight className="h-4 w-4 rtl:rotate-90" />
            </Link>
          </div>
          {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="text-4xl">📖</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                      {locale === 'ar' ? (course.titleAr || course.title) : course.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {course.instructor?.fullName}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-bold text-primary">
                        {course.discountedPrice && course.discountedPrice < course.price
                          ? `${course.discountedPrice.toLocaleString()} EGP`
                          : `${course.price.toLocaleString()} EGP`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {course.enrollmentCount} {t.courses.students}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="aspect-video skeleton" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 skeleton w-3/4" />
                    <div className="h-3 skeleton w-1/2" />
                    <div className="h-4 skeleton w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Become Instructor */}
      <section className="py-16">
        <div className="container">
          <div className="rounded-2xl gradient-primary p-8 md:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">{t.home.becomeInstructor}</h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">{t.home.becomeInstructorDesc}</p>
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-colors"
              >
                <GraduationCap className="h-5 w-5" />
                {user ? t.nav.dashboard : t.home.startLearning}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-semibold mb-4">
              <Headset className="h-4 w-4" /> {t.home.support}
            </span>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">{t.home.support}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.home.supportDesc}</p>
          </div>

          <div className="grid max-w-md mx-auto">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="group rounded-2xl border border-border bg-card p-6 flex flex-col items-center text-center hover:shadow-lg hover:-translate-y-1 hover:border-secondary/50 transition-all"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary mb-4 group-hover:scale-110 transition-transform">
                <Mail className="h-7 w-7" />
              </div>
              <h3 className="font-display font-bold text-lg mb-1">{t.home.supportEmail}</h3>
              <p className="text-sm font-semibold text-primary">{t.home.supportName}</p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                {t.home.viaEmail} <ArrowUpRight className="h-4 w-4" />
              </span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur px-3 py-4">
      <p className="font-display text-xl md:text-2xl font-bold">{label}</p>
      <p className="text-xs text-white/60">{value}</p>
    </div>
  );
}

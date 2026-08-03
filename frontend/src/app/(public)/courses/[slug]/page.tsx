'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { courseApi, orderApi, couponApi } from '@/lib/api';
import { formatPrice, courseCategoryLabel, formatDuration } from '@/lib/utils';
import { CourseCard } from '@/components/shared/CourseCard';
import Reveal from '@/components/shared/Reveal';
import {
  PlayCircle, Star, Users, Clock, ChevronDown, FileText, BookOpen, Award,
  GraduationCap, CheckCircle2, File, Lock, Languages, Tag, Percent, Gift, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CourseDetailPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [couponInfo, setCouponInfo] = useState<any>(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [tab, setTab] = useState<'content' | 'exams' | 'files'>('content');
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [similar, setSimilar] = useState<any[]>([]);

  useEffect(() => {
    if (params?.slug) {
      courseApi.getBySlug(params.slug as string)
        .then(r => setCourse(r.data))
        .catch(() => router.push('/courses'))
        .finally(() => setLoading(false));
    }
  }, [params?.slug, router]);

  useEffect(() => {
    if (!course) return;
    const title = locale === 'ar' ? (course.titleAr || course.title) : course.title;
    document.title = `${title} | Nuvexa`;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: title,
      description: (locale === 'ar' ? (course.shortDescriptionAr || course.descriptionAr) : (course.shortDescription || course.description))?.slice(0, 300) || '',
      provider: { '@type': 'Organization', name: 'Nuvexa' },
      instructor: { '@type': 'Person', name: course.instructor?.fullName || '' },
      offers: { '@type': 'Offer', price: course.discountedPrice || course.price, priceCurrency: course.currency || 'EGP', availability: 'https://schema.org/InStock' },
      ...(course.thumbnailUrl ? { image: course.thumbnailUrl } : {}),
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [course, locale]);

  useEffect(() => {
    if (course?.categoryId) {
      courseApi.list({ category: course.categoryId, limit: 4 })
        .then(r => setSimilar((r.data || []).filter((c: any) => c.id !== course.id)))
        .catch(() => {});
    }
  }, [course]);

  const handleEnroll = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return router.push('/login');
    setEnrolling(true);
    try {
      const res = await orderApi.create({
        courseId: course.id,
        couponCode: couponCode.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
      });
      router.push(`/orders/${res.data.id}/payment`);
    } catch (err: any) {
      alert(err.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const applyCoupon = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return router.push('/login');
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponMsg('');
    try {
      const res = await couponApi.apply(couponCode.trim(), course.id);
      setCouponInfo(res.data);
      setCouponMsg(`Discount: ${formatPrice(res.data.discount)}`);
    } catch (err: any) {
      setCouponInfo(null);
      setCouponMsg(err.message || 'Invalid coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="skeleton h-72 rounded-2xl mb-8" />
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-4">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-32 rounded-xl" />
          </div>
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!course) return null;

  function levelLabel(l: string): string {
    const map: Record<string, string> = {
      BEGINNER: t.courses.beginner,
      INTERMEDIATE: t.courses.intermediate,
      ADVANCED: t.courses.advanced,
      ALL_LEVELS: t.courses.allLevels,
    };
    return map[l] || l;
  }

  const sections = course.sections || [];
  const reviews = course.reviews || [];
  const instructor = course.instructor || {};
  const avgRating = course.averageRating || 0;
  const totalLectures = sections.reduce((acc: number, s: any) => acc + (s.lectures?.length || 0), 0);
  const totalExams = sections.reduce((acc: number, s: any) => acc + (s.exams?.length || 0), 0);
  const totalFiles = sections.reduce(
    (acc: number, s: any) => acc + (s.lectures || []).reduce((a: number, l: any) => a + (l._count?.resources || 0), 0),
    0,
  );

  const TABS = [
    { id: 'content' as const, label: t.courses.curriculum, icon: <BookOpen className="h-4 w-4" /> },
    { id: 'exams' as const, label: t.courses.exams, icon: <FileText className="h-4 w-4" /> },
    { id: 'files' as const, label: t.courses.files, icon: <File className="h-4 w-4" /> },
  ];

  const promoText = locale === 'ar' ? (course.titleAr || course.title) : course.title;

  return (
    <div className="pb-10">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b border-border/60 bg-background">
        <div className="container relative py-10 md:py-16">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/courses" className="transition-colors hover:text-primary">{t.courses.title}</Link>
                <span>/</span>
                <span>{courseCategoryLabel(course, locale)}</span>
              </div>

              <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight md:text-5xl">
                {promoText}
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
                {locale === 'ar' ? (course.shortDescriptionAr || course.shortDescription) : course.shortDescription}
              </p>

              {/* meta */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-lg font-extrabold text-amber-500">{avgRating.toFixed(1)}</span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn('h-4 w-4', i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                    ))}
                  </div>
                  <span className="text-muted-foreground">({course._count?.reviews || 0})</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  {course.enrollmentCount} {t.courses.students}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  {course.totalDuration ? formatDuration(course.totalDuration) : `${totalLectures} ${t.courses.lectures}`}
                </div>
                {course.language && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Languages className="h-4 w-4 text-primary" />
                    {course.language}
                  </div>
                )}
              </div>

              {/* level + instructor */}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <span className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold',
                  course.level === 'BEGINNER' ? 'bg-emerald-500/10 text-emerald-600'
                    : course.level === 'INTERMEDIATE' ? 'bg-blue-500/10 text-blue-600'
                      : course.level === 'ADVANCED' ? 'bg-rose-500/10 text-rose-600'
                        : 'bg-amber-500/10 text-amber-600',
                )}>
                  {levelLabel(course.level)}
                </span>

                <Link href={`/courses?instructor=${instructor.id}`} className="group flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                    {instructor.fullName?.charAt(0) || '?'}
                  </div>
                  <div className="text-sm">
                    <span className="block text-xs text-muted-foreground">{t.courses.instructor}</span>
                    <span className="font-semibold transition-colors group-hover:text-primary">{instructor.fullName}</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Promo card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-hero">
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-6xl">📖</div>
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                  {course.promoVideoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform hover:scale-110">
                        <PlayCircle className="h-8 w-8 text-primary" fill="#fff" />
                      </div>
                    </div>
                  )}
                  <span className="absolute bottom-3 start-3 flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    <Sparkles className="h-3.5 w-3.5" /> {t.courses.preview}
                  </span>
                </div>

                <div className="p-6">
                  <div className="flex items-end gap-3">
                    {course.discountedPrice && course.discountedPrice < course.price ? (
                      <>
                        <span className="font-display text-3xl font-extrabold">{formatPrice(course.discountedPrice)}</span>
                        <span className="mb-1 text-base text-muted-foreground line-through">{formatPrice(course.price)}</span>
                        <span className="mb-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                          -{Math.round((1 - course.discountedPrice / course.price) * 100)}%
                        </span>
                      </>
                    ) : course.price === 0 ? (
                      <span className="font-display text-3xl font-extrabold text-emerald-600">{t.courses.free}</span>
                    ) : (
                      <span className="font-display text-3xl font-extrabold">{formatPrice(course.price)}</span>
                    )}
                  </div>

                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="btn-gradient mt-5 w-full rounded-2xl py-4 text-base font-bold text-white disabled:opacity-50"
                  >
                    {enrolling ? t.common.loading : t.courses.enrollNow}
                  </button>

                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value); setCouponInfo(null); setCouponMsg(''); }}
                          placeholder="Coupon code"
                          className="h-11 w-full rounded-xl border border-border bg-background ps-9 pe-3 text-sm outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                      <button
                        onClick={applyCoupon}
                        disabled={applyingCoupon || !couponCode.trim()}
                        className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-primary/5 disabled:opacity-50"
                      >
                        {applyingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponMsg && (
                      <p className={cn('text-xs', couponInfo ? 'text-emerald-600' : 'text-crimson')}>{couponMsg}</p>
                    )}
                    <div className="relative">
                      <Gift className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        placeholder="Referral code (optional)"
                        className="h-11 w-full rounded-xl border border-border bg-background ps-9 pe-3 text-sm outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">
                    <p className="flex items-center gap-2.5 font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> {t.courses.includes}
                    </p>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <BookOpen className="h-4 w-4 text-primary/70" /> {sections.length} {locale === 'ar' ? 'قسم' : 'sections'}
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <PlayCircle className="h-4 w-4 text-primary/70" /> {totalLectures} {t.courses.lectures}
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <FileText className="h-4 w-4 text-primary/70" /> {totalExams} {t.courses.exams}
                    </div>
                    {course.allowCertificate && (
                      <div className="flex items-center gap-2.5 text-muted-foreground">
                        <Award className="h-4 w-4 text-primary/70" /> {t.courses.certificate}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CONTENT ============ */}
      <div className="container py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Tabs */}
            <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1.5">
              {TABS.map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all',
                    tab === tabItem.id ? 'bg-gradient-primary text-white shadow-card' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tabItem.icon}
                  {tabItem.label}
                  {tabItem.id === 'exams' && totalExams > 0 && (
                    <span className={cn('rounded-full px-1.5 text-xs', tab === tabItem.id ? 'bg-white/20' : 'bg-primary/10 text-primary')}>{totalExams}</span>
                  )}
                  {tabItem.id === 'files' && totalFiles > 0 && (
                    <span className={cn('rounded-full px-1.5 text-xs', tab === tabItem.id ? 'bg-white/20' : 'bg-primary/10 text-primary')}>{totalFiles}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Content tab */}
            {tab === 'content' && (
              <div className="space-y-10">
                {(() => {
                  let objs = locale === 'ar' ? (course.objectivesAr || course.objectives) : course.objectives;
                  try { objs = JSON.parse(objs); } catch { objs = []; }
                  return Array.isArray(objs) && objs.length > 0 ? (
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft md:p-8">
                      <h2 className="font-display text-xl font-bold">{t.courses.whatYouLearn}</h2>
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {objs.map((obj: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                            <span className="text-sm leading-relaxed">{obj}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null;
                })()}

                <section>
                  <h2 className="font-display text-xl font-bold">{t.courses.fullDescription}</h2>
                  <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
                    {locale === 'ar' ? (course.descriptionAr || course.description) : course.description}
                  </p>
                </section>

                {/* Curriculum accordion */}
                {sections.length > 0 && (
                  <section>
                    <h2 className="mb-5 font-display text-xl font-bold">{t.courses.curriculum}</h2>
                    <div className="space-y-3">
                      {sections.map((section: any, si: number) => {
                        const lectures = section.lectures || [];
                        const isOpen = openSection === section.id || (openSection === null && si === 0);
                        const sectionDuration = lectures.reduce((a: number, l: any) => a + (l.duration || 0), 0);
                        return (
                          <div key={section.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                            <button
                              onClick={() => setOpenSection(isOpen ? null : section.id)}
                              className="flex w-full items-center justify-between gap-3 bg-muted/30 px-5 py-4 text-start transition-colors hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-sm font-bold text-white')}>
                                  {si + 1}
                                </span>
                                <div>
                                  <span className="text-sm font-bold">{locale === 'ar' ? (section.titleAr || section.title) : section.title}</span>
                                  <div className="mt-0.5 text-xs text-muted-foreground">
                                    {lectures.length} {t.courses.lectures}
                                    {sectionDuration > 0 && ` · ${formatDuration(sectionDuration)}`}
                                  </div>
                                </div>
                              </div>
                              <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300', isOpen && 'rotate-180')} />
                            </button>
                            {isOpen && (
                              <div className="divide-y divide-border">
                                {lectures.map((lecture: any) => (
                                  <div key={lecture.id} className="flex items-center justify-between px-5 py-3.5 ps-12">
                                    <div className="flex min-w-0 items-center gap-3">
                                      {lecture.videoStorageKey || lecture.videoUrl ? (
                                        <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                                      ) : lecture.isFree ? (
                                        <Lock className="h-4 w-4 shrink-0 text-emerald-500" />
                                      ) : (
                                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                      )}
                                      <span className="truncate text-sm">{locale === 'ar' ? (lecture.titleAr || lecture.title) : lecture.title}</span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      {(lecture.isFree || lecture.isPreview) && (
                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                          {t.courses.free}
                                        </span>
                                      )}
                                      {lecture.duration ? (
                                        <span className="text-xs text-muted-foreground">{formatDuration(lecture.duration)}</span>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Exams tab */}
            {tab === 'exams' && (
              <div className="space-y-4">
                {sections.flatMap((s: any) => (s.exams || []).map((ex: any) => ({ ...ex, sectionTitle: s.titleAr || s.title })))
                  .map((exam: any) => (
                    <div key={exam.id} className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-primary-soft text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{exam.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{exam.sectionTitle}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            {exam.duration ? (
                              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {exam.duration} {t.courses.minutes}</span>
                            ) : null}
                            <span className="flex items-center gap-1">
                              <Percent className="h-3.5 w-3.5" /> {t.courses.passingScore}: {exam.passingScore}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">
                        <Lock className="h-3.5 w-3.5" /> {t.courses.startExam}
                      </span>
                    </div>
                  ))}
                {totalExams === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-card/50 py-14 text-center">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">{t.common.noData}</p>
                  </div>
                )}
              </div>
            )}

            {/* Files tab */}
            {tab === 'files' && (
              <div className="space-y-4">
                {sections.flatMap((s: any) => (s.lectures || []).filter((l: any) => (l._count?.resources || 0) > 0)
                  .map((l: any) => ({ ...l, sectionTitle: s.titleAr || s.title })))
                  .map((lec: any) => (
                    <div key={lec.id} className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-primary-soft text-primary">
                        <File className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{locale === 'ar' ? (lec.titleAr || lec.title) : lec.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {lec._count.resources} {t.courses.filesCount} · {lec.sectionTitle}
                        </p>
                      </div>
                    </div>
                  ))}
                {totalFiles === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-card/50 py-14 text-center">
                    <File className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">{t.common.noData}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reviews */}
            <section>
              <h2 className="mb-5 font-display text-xl font-bold">{t.courses.reviews} ({reviews.length})</h2>
              <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
                  <span className="font-display text-5xl font-extrabold">{avgRating.toFixed(1)}</span>
                  <div className="mt-2 flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn('h-5 w-5', i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{course._count?.reviews || 0} {t.courses.reviews}</p>
                </div>
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card/50 py-14 text-center">
                      <Star className="mx-auto h-10 w-10 text-muted-foreground/40" />
                      <p className="mt-3 text-sm text-muted-foreground">{t.common.noData}</p>
                    </div>
                  ) : (
                    reviews.map((review: any) => (
                      <div key={review.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                            {review.student?.fullName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{review.student?.fullName}</p>
                            <div className="mt-0.5 flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={cn('h-3.5 w-3.5', i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.comment && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg font-bold">{t.courses.instructor}</h3>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-white">
                  {instructor.fullName?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold">{instructor.fullName}</p>
                  <p className="text-xs text-muted-foreground">{instructor.instructorProfile?.headline || ''}</p>
                </div>
              </div>
              {instructor.instructorProfile?.biography && (
                <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{instructor.instructorProfile.biography}</p>
              )}
            </div>

            {(() => {
              let reqs = locale === 'ar' ? (course.requirementsAr || course.requirements) : course.requirements;
              try { reqs = JSON.parse(reqs); } catch { reqs = []; }
              return Array.isArray(reqs) && reqs.length > 0 ? (
                <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                    <GraduationCap className="h-5 w-5 text-primary" /> {t.courses.requirements}
                  </h3>
                  <ul className="mt-4 space-y-2.5">
                    {reqs.map((req: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      </div>

      {/* ============ SIMILAR ============ */}
      {similar.length > 0 && (
        <section className="bg-gradient-primary-soft/40 py-14">
          <div className="container">
            <div className="mb-8 flex items-center gap-3">
              <span className="h-8 w-1.5 rounded-full bg-gradient-primary" />
              <h2 className="font-display text-2xl font-extrabold">{t.courses.similarCourses}</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((c, i) => (
                <Reveal key={c.id} delay={i * 0.06}><CourseCard course={c} /></Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

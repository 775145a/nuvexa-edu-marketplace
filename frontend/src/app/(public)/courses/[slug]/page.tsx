'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { courseApi, orderApi, couponApi } from '@/lib/api';
import { formatPrice, courseCategoryLabel } from '@/lib/utils';

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
        <div className="skeleton h-64 rounded-2xl mb-8" />
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-4">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-32" />
          </div>
          <div className="skeleton h-96 rounded-xl" />
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

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero text-white">
        <div className="container py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
                <Link href="/courses" className="hover:text-white">{t.courses.title}</Link>
                <span>/</span>
                <span>{courseCategoryLabel(course, locale)}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
                {locale === 'ar' ? (course.titleAr || course.title) : course.title}
              </h1>
              <p className="text-white/70 mb-4">{course.shortDescription}</p>
              <div className="flex items-center gap-4 text-sm text-white/60">
                <span>{course.instructor?.fullName}</span>
                <span>•</span>
                <span>{course.enrollmentCount} {t.courses.students}</span>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  course.level === 'BEGINNER' ? 'bg-emerald-500/20 text-emerald-300' :
                  course.level === 'INTERMEDIATE' ? 'bg-blue-500/20 text-blue-300' :
                  course.level === 'ADVANCED' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-amber-500/20 text-amber-300'
                }`}>{levelLabel(course.level)}</span>
              </div>
            </div>

            {/* Sidebar Card */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                  ) : <div className="text-5xl">📖</div>}
                </div>
                <div className="p-6">
                  <div className="text-3xl font-bold mb-4">
                    {course.discountedPrice && course.discountedPrice < course.price ? (
                      <><span className="text-white/50 line-through text-lg mr-2">{formatPrice(course.price)}</span>{formatPrice(course.discountedPrice)}</>
                    ) : formatPrice(course.price)}
                  </div>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mb-3"
                  >
                    {enrolling ? t.common.loading : t.courses.enrollNow}
                  </button>
                  <div className="space-y-2 mb-3">
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value); setCouponInfo(null); setCouponMsg(''); }}
                        placeholder="Coupon code"
                        className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={applyingCoupon || !couponCode.trim()}
                        className="rounded-lg bg-white/10 border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                      >
                        {applyingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponMsg && (
                      <p className={`text-xs ${couponInfo ? 'text-emerald-400' : 'text-red-400'}`}>{couponMsg}</p>
                    )}
                    <input
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Referral code (optional)"
                      className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
                    />
                  </div>
                  <div className="space-y-2 text-sm text-white/60">
                    <div className="flex items-center gap-2">📚 {course.totalSections || sections.length} sections</div>
                    <div className="flex items-center gap-2">🎥 {course.totalLectures} {t.courses.lectures}</div>
                    {course.allowCertificate && <div className="flex items-center gap-2">📜 {t.courses.certificate}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            <section>
              <h2 className="text-xl font-bold mb-4">{t.courses.description}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {locale === 'ar' ? (course.descriptionAr || course.description) : course.description}
              </p>
            </section>

            {/* Objectives */}
            {(() => {
              let objs = locale === 'ar' ? (course.objectivesAr || course.objectives) : course.objectives;
              try { objs = JSON.parse(objs); } catch { objs = []; }
              return Array.isArray(objs) && objs.length > 0 ? (
                <section>
                  <h2 className="text-xl font-bold mb-4">{t.courses.whatYouLearn}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {objs.map((obj: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span className="text-sm">{obj}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}

            {/* Curriculum */}
            {sections.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">{t.courses.curriculum}</h2>
                <div className="space-y-2">
                  {sections.map((section: any) => {
                    const lectures = section.lectures || [];
                    return (
                      <div key={section.id} className="rounded-xl border border-border overflow-hidden">
                        <div className="p-4 bg-muted/30 font-medium text-sm flex items-center justify-between">
                          <span>{locale === 'ar' ? (section.titleAr || section.title) : section.title}</span>
                          <span className="text-xs text-muted-foreground">{lectures.length} {t.courses.lectures}</span>
                        </div>
                        {lectures.length > 0 && (
                          <div className="divide-y divide-border">
                            {lectures.map((lecture: any) => (
                              <div key={lecture.id} className="flex items-center justify-between p-4 pl-8">
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground">
                                    {lecture.videoUrl ? '🎬' : lecture.isFree ? '🔓' : '📄'}
                                  </span>
                                  <span className="text-sm">{locale === 'ar' ? (lecture.titleAr || lecture.title) : lecture.title}</span>
                                </div>
                                {lecture.duration && (
                                  <span className="text-xs text-muted-foreground">
                                    {Math.floor(lecture.duration / 60)}:{String(lecture.duration % 60).padStart(2, '0')}
                                  </span>
                                )}
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

            {/* Reviews */}
            <section>
              <h2 className="text-xl font-bold mb-4">{t.courses.reviews} ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-sm">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-semibold">
                          {review.student?.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{review.student?.fullName}</p>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-xs ${i < review.rating ? 'text-amber-400' : 'text-muted-foreground'}`}>★</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">{t.courses.instructor}</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold">
                  {instructor.fullName?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium">{instructor.fullName}</p>
                  <p className="text-xs text-muted-foreground">{instructor.instructorProfile?.headline || ''}</p>
                </div>
              </div>
            </div>

            {/* Requirements */}
            {(() => {
              let reqs = locale === 'ar' ? (course.requirementsAr || course.requirements) : course.requirements;
              try { reqs = JSON.parse(reqs); } catch { reqs = []; }
              return Array.isArray(reqs) && reqs.length > 0 ? (
                <div className="p-6 rounded-xl border border-border bg-card">
                  <h3 className="font-semibold mb-3">{t.courses.requirements}</h3>
                  <ul className="space-y-2">
                    {reqs.map((req: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
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
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { orderApi } from '@/lib/api';

export default function OrderSuccessPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [courseInfo, setCourseInfo] = useState<{ id: string; slug: string } | null>(null);

  useEffect(() => {
    if (!orderId) return;
    orderApi.myOrders().then(r => {
      const order = (r.data || []).find((o: any) => o.id === orderId);
      const c = order?.items?.[0]?.course;
      if (c) setCourseInfo({ id: c.id, slug: c.slug });
    }).catch(() => {});
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="text-3xl font-display font-bold mb-3">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8">You are now enrolled in the course. Start learning right away.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {courseInfo && (
            <Link href={`/learn/${courseInfo.id}`}
              className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity">
              Go to Course
            </Link>
          )}
          <Link href="/student/my-courses"
            className="px-6 py-3 rounded-xl border border-border font-semibold hover:bg-accent transition-colors">
            My Courses
          </Link>
          <Link href="/courses"
            className="px-6 py-3 rounded-xl border border-border font-semibold hover:bg-accent transition-colors">
            Browse More
          </Link>
        </div>
      </div>
    </div>
  );
}

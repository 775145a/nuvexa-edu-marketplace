'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { Star, Users, ArrowUpRight, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Course = Record<string, any>;

function formatPrice(value: number | null | undefined): string {
  const v = value ?? 0;
  return `${v.toLocaleString()} EGP`;
}

export function CourseCard({ course, className }: { course: Course; className?: string }) {
  const { t, locale } = useI18n();
  const title = locale === 'ar' ? (course.titleAr || course.title) : course.title;
  const category = locale === 'ar' ? (course.category?.nameAr || course.category?.name) : course.category?.name;
  const hasDiscount = course.discountedPrice && course.discountedPrice < course.price;
  const rating = course.averageRating || 0;
  const students = course.enrollmentCount || course._count?.enrollments || 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft card-hover',
        className,
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/15">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">📖</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {category && (
          <span className="absolute top-3 start-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur">
            {category}
          </span>
        )}

        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-xl backdrop-blur">
            <PlayCircle className="h-7 w-7" />
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.6rem] font-display text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-primary-soft text-[10px] font-bold text-secondary">
            {(course.instructor?.fullName || '?').charAt(0)}
          </span>
          {course.instructor?.fullName}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current" />
            {rating > 0 ? rating.toFixed(1) : t.courses.newest}
          </span>
          <span className="text-xs text-muted-foreground">
            ({course._count?.reviews ?? 0})
          </span>
          <span className="ms-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {students.toLocaleString()}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex items-baseline gap-1.5">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(course.price)}</span>
            )}
            <span className="font-display text-base font-extrabold gradient-text">
              {course.price === 0 ? t.courses.free : formatPrice(hasDiscount ? course.discountedPrice : course.price)}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary-soft px-2.5 py-1.5 text-xs font-semibold text-secondary transition-all group-hover:bg-gradient-primary group-hover:text-white">
            {t.dash.viewCourse} <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </span>
        </div>
      </div>
    </Link>
  );
}

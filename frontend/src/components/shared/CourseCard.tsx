'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { Star, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type Course = Record<string, any>;

function formatDuration(minutes: number | null | undefined, hoursLabel: string, minutesLabel: string): string {
  const m = Math.round(minutes ?? 0);
  if (m <= 0) return '';
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0 && rem > 0) return `${h} ${hoursLabel} ${rem} ${minutesLabel}`;
  if (h > 0) return `${h} ${hoursLabel}`;
  return `${rem} ${minutesLabel}`;
}

export function CourseCard({ course, className, showPrice = false }: { course: Course; className?: string; showPrice?: boolean }) {
  const { t, locale } = useI18n();
  const title = locale === 'ar' ? (course.titleAr || course.title) : course.title;
  const category = locale === 'ar' ? (course.category?.nameAr || course.category?.name) : course.category?.name;
  const rating = course.averageRating || 0;
  const students = course.enrollmentCount || course._count?.enrollments || 0;
  const duration = course.totalDuration || course.duration;
  const price = course.discountedPrice && course.discountedPrice < course.price ? course.discountedPrice : course.price;
  const hasDiscount = course.discountedPrice && course.discountedPrice < course.price;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(235,32,39,0.25)]',
        className,
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/15 to-accent/15">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">📖</div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {category && (
          <span className="text-xs font-semibold text-primary">{category}</span>
        )}

        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <Star className={cn('h-3.5 w-3.5', rating > 0 ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
          {rating > 0 ? (
            <>
              <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({students.toLocaleString()}+ {t.home.statsStudents})
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{t.courses.newest}</span>
          )}
        </div>

        <h3 className="mt-1.5 line-clamp-1 font-display text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>

        {duration > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(duration, t.courses.hours, t.courses.minutes || t.courses.hours)}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {(course.instructor?.fullName || '?').charAt(0)}
          </span>
          <span className="truncate text-xs text-muted-foreground">{course.instructor?.fullName}</span>
        </div>

        {showPrice && (
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
            <span className="font-display text-base font-extrabold text-primary">
              {course.price === 0 ? t.courses.free : `${Number(price ?? 0).toLocaleString()} ${course.currency || 'EGP'}`}
            </span>
            {hasDiscount && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground line-through">
                {`${Number(course.price).toLocaleString()} ${course.currency || 'EGP'}`}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

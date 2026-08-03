'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { courseApi, categoryApi } from '@/lib/api';
import { CourseCard } from '@/components/shared/CourseCard';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function CoursesContent() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];

  useEffect(() => {
    categoryApi.list().then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit: 12, sort };
    if (category) params.categoryId = category;
    if (level) params.level = level;
    if (search) params.search = search;
    courseApi.list(params)
      .then((r: any) => { setCourses(r.data || []); setTotalPages(r.totalPages || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, level, sort, page, search]);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground md:text-4xl">{t.courses.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t.courses.explore}</p>
        </div>
        <div className="flex w-full items-center gap-2 rounded-full border border-border bg-card p-1.5 md:w-80">
          <Search className="ms-3 h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.home.searchPlaceholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setCategory(''); setPage(1); }}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
            category === '' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary',
          )}
        >
          {t.common.all}
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => { setCategory(cat.id); setPage(1); }}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
              category === cat.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary',
            )}
          >
            {locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}
          </button>
        ))}
      </div>

      {/* Level + sort */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <select
          value={level}
          onChange={e => { setLevel(e.target.value); setPage(1); }}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary/40"
        >
          <option value="">{t.courses.allLevels}</option>
          {levels.map(l => (
            <option key={l} value={l}>{getLevelLabel(l, t)}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary/40"
        >
          <option value="newest">{t.courses.newest}</option>
          <option value="popular">{t.courses.popular}</option>
          <option value="rating">{t.courses.rating}</option>
          <option value="price_asc">{t.courses.priceLow}</option>
          <option value="price_desc">{t.courses.priceHigh}</option>
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
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
      ) : courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 py-20 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-8 w-8 text-primary" />
          </span>
          <h3 className="mt-5 font-display text-xl font-bold text-foreground">{t.courses.noResults}</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{t.courses.adjustFilters}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course: any) => (
              <CourseCard key={course.id} course={course} showPrice />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm disabled:opacity-50 hover:border-primary/40"
                aria-label={t.common.previous}
              >
                <ChevronRight className="h-4 w-4 rtl:hidden" />
                <ChevronLeft className="hidden h-4 w-4 rtl:block" />
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm disabled:opacity-50 hover:border-primary/40"
                aria-label={t.common.next}
              >
                <ChevronLeft className="h-4 w-4 rtl:hidden" />
                <ChevronRight className="hidden h-4 w-4 rtl:block" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getLevelLabel(level: string, t: any): string {
  const map: Record<string, string> = {
    BEGINNER: t.courses.beginner,
    INTERMEDIATE: t.courses.intermediate,
    ADVANCED: t.courses.advanced,
    ALL_LEVELS: t.courses.allLevels,
  };
  return map[level] || level;
}

function CoursesFallback() {
  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="aspect-video skeleton" />
            <div className="space-y-3 p-4">
              <div className="h-4 skeleton w-3/4" />
              <div className="h-3 skeleton w-1/2" />
              <div className="h-4 skeleton w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<CoursesFallback />}>
      <CoursesContent />
    </Suspense>
  );
}

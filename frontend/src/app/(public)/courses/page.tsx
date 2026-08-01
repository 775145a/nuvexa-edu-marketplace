'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { courseApi, categoryApi } from '@/lib/api';

function CoursesContent() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{t.courses.explore}</h1>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              placeholder={t.courses.search}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8 p-4 rounded-xl border border-border bg-card">
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
        >
          <option value="">{t.common.all} {t.courses.title}</option>
          {categories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>{locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}</option>
          ))}
        </select>
        <select
          value={level}
          onChange={e => { setLevel(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
        >
          <option value="">{t.courses.allLevels}</option>
          {levels.map(l => (
            <option key={l} value={l}>{getLevelLabel(l, t)}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <div className="aspect-video skeleton" />
              <div className="p-4 space-y-3">
                <div className="h-4 skeleton w-3/4" />
                <div className="h-3 skeleton w-1/2" />
                <div className="h-4 skeleton w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">{t.courses.noResults}</h3>
          <p className="text-muted-foreground">{t.courses.adjustFilters}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course: any) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                  ) : <div className="text-4xl">📖</div>}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                    {locale === 'ar' ? (course.titleAr || course.title) : course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{course.instructor?.fullName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      course.level === 'BEGINNER' ? 'bg-emerald-100 text-emerald-700' :
                      course.level === 'INTERMEDIATE' ? 'bg-blue-100 text-blue-700' :
                      course.level === 'ADVANCED' ? 'bg-purple-100 text-purple-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {getLevelLabel(course.level, t)}
                    </span>
                  </div>
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

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-50 hover:bg-accent">
                {t.common.previous}
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-50 hover:bg-accent">
                {t.common.next}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <div className="aspect-video skeleton" />
            <div className="p-4 space-y-3">
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

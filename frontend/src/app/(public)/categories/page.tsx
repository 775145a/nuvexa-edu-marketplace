'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { categoryApi } from '@/lib/api';

export default function CategoriesPage() {
  const { t, locale } = useI18n();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoryApi.list().then(r => setCategories(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="container py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-display font-bold">{t.nav.categories}</h1>
        <p className="text-muted-foreground mt-2">{t.courses.explore}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat: any) => (
            <Link
              key={cat.id}
              href={`/courses?category=${cat.id}`}
              className="group p-8 rounded-xl border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all text-center"
            >
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 text-3xl">
                {cat.icon || '📚'}
              </div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {cat._count?.courses || 0} {t.courses.title}
              </p>
              {cat.children?.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1">
                  {cat.children.slice(0, 3).map((child: any) => (
                    <span key={child.id} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {locale === 'ar' ? (child.nameAr || child.name) : child.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

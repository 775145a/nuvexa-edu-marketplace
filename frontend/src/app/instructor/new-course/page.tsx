'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { courseApi, categoryApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input, Textarea, Field } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Primitives';
import { Sparkles, ArrowLeft, AlertCircle } from 'lucide-react';

export default function NewCoursePage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    description: '',
    price: '',
    categoryId: '',
    level: 'ALL_LEVELS',
    language: 'Arabic',
    customFieldAr: '',
    customFieldEn: '',
  });
  const [error, setError] = useState('');
  const OTHER = '__other__';

  useEffect(() => {
    categoryApi.list().then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.description || !form.price || !form.categoryId) {
      setError(t.common.error);
      return;
    }
    if (form.categoryId === OTHER && !form.customFieldAr.trim()) {
      setError(t.courses.customFieldArRequired);
      return;
    }
    setLoading(true);
    try {
      const res = await courseApi.create({ ...form, price: parseFloat(form.price) });
      router.push(`/instructor/courses/${res.data?.id || ''}/manage`);
    } catch (err: any) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell role="INSTRUCTOR" title={t.instructor.createCourse} subtitle={t.instructor.createFirst}>
      <div className="mx-auto max-w-2xl">
        <Card className="p-0">
          <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-accent text-white shadow-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{t.instructor.createCourse}</CardTitle>
                <CardDescription>{t.instructor.createFirst}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-crimson/30 bg-crimson/5 p-3 text-sm text-crimson">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label={t.courses.title} required>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Advanced React Masterclass" />
              </Field>

              <Field label={t.courses.description}>
                <Textarea rows={3} value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} placeholder="Short tagline shown in course cards" />
              </Field>

              <Field label={t.courses.fullDescription} required>
                <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detailed course description..." />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label={t.courses.price} required>
                  <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                </Field>

                <Field label={t.dash.avgRating}>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    className="h-10 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/60"
                  >
                    <option value="ALL_LEVELS">{t.courses.allLevels}</option>
                    <option value="BEGINNER">{t.courses.beginner}</option>
                    <option value="INTERMEDIATE">{t.courses.intermediate}</option>
                    <option value="ADVANCED">{t.courses.advanced}</option>
                  </select>
                </Field>
              </div>

              <Field label={t.nav.categories} required>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="h-10 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/60"
                >
                  <option value="">{t.common.select}</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}</option>
                  ))}
                  <option value={OTHER}>{t.courses.otherCategory}</option>
                </select>
              </Field>

              {form.categoryId === OTHER && (
                <div className="space-y-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
                  <Field label={t.courses.customFieldAr} required>
                    <Input value={form.customFieldAr} onChange={(e) => setForm({ ...form, customFieldAr: e.target.value })} placeholder="مثال: البرمجة الروبوتية" dir="rtl" />
                  </Field>
                  <Field label={t.courses.customFieldEn}>
                    <Input value={form.customFieldEn} onChange={(e) => setForm({ ...form, customFieldEn: e.target.value })} placeholder="e.g. Robotics Programming" dir="ltr" />
                    <p className="mt-1 text-xs text-muted-foreground">{t.courses.customFieldOptional}</p>
                  </Field>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.push('/instructor/courses')}>
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t.common.cancel}
                </Button>
                <Button type="submit" variant="gradient" disabled={loading}>
                  {loading ? <PageLoader label="" /> : <Sparkles className="h-4 w-4" />} {t.instructor.createCourse}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

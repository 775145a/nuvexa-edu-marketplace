'use client';

import { Suspense, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { examApi } from '@/lib/api';

function CreateExamForm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const sectionId = searchParams.get('sectionId') || '';

  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [passingScore, setPassingScore] = useState('60');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sectionId) return;
    setSaving(true);
    try {
      const res = await examApi.create(courseId, {
        title: title.trim(),
        titleAr: titleAr.trim() || undefined,
        description: description.trim() || undefined,
        sectionId,
        duration: parseInt(duration),
        passingScore: parseInt(passingScore),
      });
      router.push(`/instructor/courses/${courseId}/manage/exams/${res.data.id}`);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href={`/instructor/courses/${courseId}/manage`} className="text-sm text-primary hover:underline mb-4 inline-block">&larr; Back to course</Link>
      <h1 className="text-2xl font-display font-bold mb-6">Create Exam</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title (English)</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Title (Arabic)</label>
          <input type="text" value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl"
            className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={1}
              className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Passing Score (%)</label>
            <input type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} min={1} max={100}
              className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <button type="submit" disabled={saving || !title.trim() || !sectionId}
            className="px-6 py-2 rounded-xl gradient-primary text-white font-medium disabled:opacity-50">
            {saving ? t.common.loading : t.common.create}
          </button>
          <Link href={`/instructor/courses/${courseId}/manage`} className="px-6 py-2 rounded-xl border border-border text-sm">
            {t.common.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function CreateExamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
      <CreateExamForm />
    </Suspense>
  );
}

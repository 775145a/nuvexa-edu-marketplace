'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { examApi } from '@/lib/api';

export default function EditExamPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const courseId = params.id as string;

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [passingScore, setPassingScore] = useState('60');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  // New question form
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('MCQ');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('0');
  const [qScore, setQScore] = useState('1');
  const [addingQ, setAddingQ] = useState(false);

  const [results, setResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    if (!examId) return;
    examApi.get(examId).then(r => {
      const d = r.data;
      setExam(d);
      setTitle(d.title || '');
      setDescription(d.description || '');
      setDuration(String(d.duration || 30));
      setPassingScore(String(d.passingScore || 60));
      setIsPublished(d.isPublished ?? true);
      setQuestions(d.questions || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [examId]);

  const loadResults = async () => {
    setResultsLoading(true);
    try {
      const r = await examApi.results(examId);
      setResults(r.data || []);
    } catch {}
    setResultsLoading(false);
  };

  useEffect(() => {
    if (examId) loadResults();
  }, [examId]);

  const handleUpdateExam = async () => {
    setSaving(true);
    try {
      await examApi.update(examId, { title, description, duration: parseInt(duration), passingScore: parseInt(passingScore), isPublished });
    } catch {}
    setSaving(false);
  };

  const handleAddQuestion = async () => {
    if (!qText.trim()) return;
    setAddingQ(true);
    try {
      let options: any[] = [];
      if (qType === 'MCQ') {
        options = qOptions.filter(o => o.trim()).map((text, i) => ({
          text,
          isCorrect: i === parseInt(qCorrect),
          order: i,
        }));
      } else if (qType === 'TRUE_FALSE') {
        options = [
          { text: 'True', isCorrect: qCorrect === 'true', order: 0 },
          { text: 'False', isCorrect: qCorrect === 'false', order: 1 },
        ];
      }
      const res = await examApi.addQuestion(examId, {
        text: qText.trim(),
        type: qType,
        options,
        score: parseInt(qScore),
      });
      setQuestions([...questions, res.data]);
      setQText(''); setQOptions(['', '', '', '']); setQCorrect('0');
    } catch {}
    setAddingQ(false);
  };

  const handleDeleteQuestion = async (id: string) => {
    try { await examApi.deleteQuestion(id); setQuestions(questions.filter(q => q.id !== id)); } catch {}
  };

  const updateOption = (i: number, v: string) => {
    const newOpts = [...qOptions];
    newOpts[i] = v;
    setQOptions(newOpts);
  };

  const passRate = results.length > 0 ? Math.round((results.filter(r => r.passed).length / results.length) * 100) : 0;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length)
    : 0;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  if (loading) return <div className="p-8"><div className="h-8 skeleton w-64 mb-6" /><div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div></div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/instructor/courses/${courseId}/manage`} className="text-sm text-primary hover:underline mb-4 inline-block">&larr; Back to course</Link>
      <h1 className="text-2xl font-display font-bold mb-6">{locale === 'ar' ? (exam?.titleAr || exam?.title) : exam?.title}</h1>

      {/* Exam details */}
      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Exam Details</h2>
        <div className="space-y-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
            className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2}
            className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={1}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Passing Score (%)</label>
              <input type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} min={1} max={100}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="accent-primary w-4 h-4" />
            Publish exam (visible to students)
          </label>
          <button onClick={handleUpdateExam} disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50">
            {saving ? t.common.loading : t.common.save}
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Questions ({questions.length})</h2>

        <div className="space-y-3 mb-6">
          {questions.map((q, i) => (
            <div key={q.id} className="p-3 rounded-lg border border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">Q{i + 1}. {q.text}</p>
                  {q.type === 'MCQ' && q.options?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {q.options.map((opt: string, oi: number) => (
                        <p key={oi} className={`text-xs ${opt === q.correctAnswer ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                          {String.fromCharCode(65 + oi)}. {opt} {opt === q.correctAnswer && '✓'}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Score: {q.score}</p>
                </div>
                <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-red-500 hover:underline flex-shrink-0">{t.common.delete}</button>
              </div>
            </div>
          ))}
        </div>

        {/* Add question form */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-bold mb-3">Add Question</h3>
          <div className="space-y-3">
            <input type="text" value={qText} onChange={e => setQText(e.target.value)} placeholder="Question text"
              className="w-full px-3 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium">Type:</label>
              <select value={qType} onChange={e => setQType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-input bg-background text-sm">
                <option value="MCQ">Multiple Choice</option>
                <option value="TRUE_FALSE">True/False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
              </select>
              <label className="text-xs font-medium ml-2">Score:</label>
              <input type="number" value={qScore} onChange={e => setQScore(e.target.value)} min={1} className="w-20 px-3 py-2 rounded-xl border border-input bg-background text-sm" />
            </div>

            {qType === 'MCQ' && (
              <div className="space-y-2">
                {qOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={qCorrect === String(i)} onChange={() => setQCorrect(String(i))} />
                    <input type="text" value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm" />
                  </div>
                ))}
              </div>
            )}

            {qType === 'TRUE_FALSE' && (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="tf" checked={qCorrect === 'true'} onChange={() => setQCorrect('true')} /> True
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="tf" checked={qCorrect === 'false'} onChange={() => setQCorrect('false')} /> False
                </label>
              </div>
            )}

            <button onClick={handleAddQuestion} disabled={addingQ || !qText.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50">
              {addingQ ? t.common.loading : t.common.add}
            </button>
          </div>
        </div>
      </div>

      {/* Student results */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Student Results ({results.length})</h2>
          <button onClick={loadResults} disabled={resultsLoading}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-accent disabled:opacity-50">
            {resultsLoading ? t.common.loading : t.common.refresh}
          </button>
        </div>

        {results.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gradient-primary-soft p-4 text-center">
              <p className="text-2xl font-display font-extrabold text-primary">{passRate}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pass rate</p>
            </div>
            <div className="rounded-xl bg-gradient-primary-soft p-4 text-center">
              <p className="text-2xl font-display font-extrabold text-primary">{avgScore}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Average score</p>
            </div>
          </div>
        )}

        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No attempts yet. Results will appear here when students take this exam.</p>
        ) : (
          <div className="space-y-2">
            {results.map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                  {r.student?.fullName?.charAt(0) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.student?.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">{r.student?.email}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Attempt #{r.attemptNumber} · {formatDate(r.completedAt || r.createdAt)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-display text-base font-extrabold">{r.percentage}%</p>
                  <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {r.passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

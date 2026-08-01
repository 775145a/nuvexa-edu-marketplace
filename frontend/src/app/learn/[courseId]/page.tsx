'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Hls from 'hls.js';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { courseApi, examApi, studentApi, qaApi } from '@/lib/api';

function LectureVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: Hls | null = null;
    const isHls = /\.m3u8(\?|#|$)/i.test(src);
    if (isHls && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }
    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  return <video ref={ref} controls playsInline className="w-full h-full" />;
}

function QASection({ lectureId, locale }: { lectureId: string; locale: string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await qaApi.questions(lectureId);
      setQuestions(res.data || []);
    } catch {}
  }, [lectureId]);

  useEffect(() => {
    setQuestions([]);
    setNewBody('');
    setReplyingTo(null);
    load();
  }, [lectureId, load]);

  const ask = async () => {
    if (!newBody.trim()) return;
    setSubmitting(true);
    try {
      await qaApi.ask(lectureId, newBody.trim());
      setNewBody('');
      await load();
    } catch {}
    setSubmitting(false);
  };

  const reply = async (questionId: string) => {
    const body = (replies[questionId] || '').trim();
    if (!body) return;
    try {
      await qaApi.reply(questionId, body);
      setReplyingTo(null);
      setReplies((r) => ({ ...r, [questionId]: '' }));
      await load();
    } catch {}
  };

  const remove = async (id: string) => {
    try {
      await qaApi.delete(id);
      await load();
    } catch {}
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const label = {
    title: locale === 'ar' ? 'سؤال وجواب' : 'Questions & Answers',
    placeholder: locale === 'ar' ? 'اسأل سؤالاً عن المحاضرة...' : 'Ask a question about this lecture...',
    ask: locale === 'ar' ? 'اسأل' : 'Ask',
    reply: locale === 'ar' ? 'أجب' : 'Reply',
    replyBtn: locale === 'ar' ? 'رد' : 'Reply',
    empty: locale === 'ar' ? 'لا توجد أسئلة بعد. كن أول من يسأل!' : 'No questions yet. Be the first to ask!',
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6">
      <h3 className="font-bold mb-4">{label.title}</h3>

      <div className="flex gap-2 mb-6">
        <input
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder={label.placeholder}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <button onClick={ask} disabled={submitting || !newBody.trim()}
          className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          {submitting ? '...' : label.ask}
        </button>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{label.empty}</p>
      ) : (
        <div className="space-y-4">
          {questions.map((q: any) => (
            <div key={q.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-semibold">
                    {q.user?.fullName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {q.user?.fullName}
                      {q.user?.role === 'INSTRUCTOR' && <span className="ml-1 text-xs text-primary"> ({locale === 'ar' ? 'المُدرّب' : 'instructor'})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmt(q.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setReplyingTo(replyingTo === q.id ? null : q.id)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
                    {label.replyBtn}
                  </button>
                  <button onClick={() => remove(q.id)} className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-red-500">
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-sm mt-2 whitespace-pre-line">{q.body}</p>

              {replyingTo === q.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={replies[q.id] || ''}
                    onChange={(e) => setReplies((r) => ({ ...r, [q.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && reply(q.id)}
                    placeholder={label.reply}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                  <button onClick={() => reply(q.id)} disabled={!(replies[q.id] || '').trim()}
                    className="px-3 py-2 rounded-lg bg-accent/10 text-accent-700 text-sm font-semibold disabled:opacity-50">
                    {label.reply}
                  </button>
                </div>
              )}

              {(q.replies || []).length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {q.replies.map((r: any) => (
                    <div key={r.id} className="flex items-start gap-2 pl-6">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {r.user?.fullName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold">{r.user?.fullName}</p>
                          <span className="text-[10px] text-muted-foreground">{fmt(r.createdAt)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{r.body}</p>
                      </div>
                      <button onClick={() => remove(r.id)} className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LearnPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [activeLecture, setActiveLecture] = useState<any>(null);

  // Exam taking state
  const [activeExam, setActiveExam] = useState<any>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);
  const [examTimer, setExamTimer] = useState<number>(0);

  useEffect(() => {
    if (!courseId) return;
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    Promise.all([
      studentApi.checkEnrolled(courseId).catch(() => null),
      courseApi.getById(courseId).then(r => r.data).catch(() => null),
    ]).then(([enrollCheck, data]) => {
      if (!data) { router.push('/courses'); return; }
      if (!enrollCheck?.data?.enrolled) { router.push(`/courses/${data.slug}`); return; }
      setCourse(data);
      setSections(data.sections || []);
      const firstLecture = data.sections?.[0]?.lectures?.[0];
      if (firstLecture) setActiveLecture(firstLecture);
      setLoading(false);
    });
  }, [courseId, router]);

  // Exam timer
  useEffect(() => {
    if (!activeExam || examResult || examTimer <= 0) return;
    const interval = setInterval(() => {
      setExamTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeExam, examResult, examTimer]);

  const handleStartExam = async (exam: any) => {
    try {
      const res = await examApi.get(exam.id);
      const questions = res.data?.questions || [];
      if (questions.length === 0) return;
      setExamQuestions(questions);
      setActiveExam(exam);
      setExamAnswers({});
      setExamResult(null);
      setExamTimer(exam.duration * 60);
    } catch {}
  };

  const handleSubmitExam = useCallback(async () => {
    if (!activeExam || examSubmitting) return;
    setExamSubmitting(true);
    try {
      const answers = examQuestions.map(q => ({
        questionId: q.id,
        selectedOptionId: examAnswers[q.id] || null,
      }));
      const res = await examApi.submit(activeExam.id, { answers });
      setExamResult(res.data);
    } catch {}
    setExamSubmitting(false);
  }, [activeExam, examQuestions, examAnswers, examSubmitting]);

  if (loading) return <div className="p-8 max-w-6xl mx-auto"><div className="skeleton h-12 w-64 mb-6" /><div className="flex gap-6"><div className="w-72 skeleton h-96 rounded-xl" /><div className="flex-1 skeleton h-96 rounded-xl" /></div></div>;

  if (activeExam && !examResult) {
    const minutes = Math.floor(examTimer / 60);
    const seconds = examTimer % 60;
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">{locale === 'ar' ? (activeExam.titleAr || activeExam.title) : activeExam.title}</h1>
            <div className={`text-lg font-mono font-bold px-4 py-2 rounded-xl ${examTimer < 300 ? 'bg-red-50 text-red-600' : 'bg-muted'}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {examQuestions.map((q: any, i: number) => (
              <div key={q.id} className="rounded-xl border border-border bg-card p-6">
                <p className="font-medium mb-4">{i + 1}. {q.text} <span className="text-xs text-muted-foreground">({q.score} pt)</span></p>
                <div className="space-y-2">
                  {(q.options || []).map((opt: any) => (
                    <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${examAnswers[q.id] === opt.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}>
                      <input type="radio" name={`q_${q.id}`} value={opt.id} checked={examAnswers[q.id] === opt.id} onChange={() => setExamAnswers(prev => ({ ...prev, [q.id]: opt.id }))} className="accent-primary" />
                      <span className="text-sm">{opt.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSubmitExam} disabled={examSubmitting}
            className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
            {examSubmitting ? t.common.loading : 'Submit Exam'}
          </button>
        </div>
      </div>
    );
  }

  if (activeExam && examResult) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto text-center">
          <div className={`text-7xl mb-6 ${examResult.passed ? '' : ''}`}>{examResult.passed ? '🎉' : '💪'}</div>
          <h1 className="text-2xl font-bold mb-2">{examResult.passed ? 'Congratulations!' : 'Keep Trying!'}</h1>
          <div className="text-5xl font-bold text-primary mb-4">{examResult.percentage}%</div>
          <p className="text-muted-foreground mb-2">Score: {examResult.score} / {examResult.totalScore}</p>
          <p className="text-sm text-muted-foreground mb-8">Attempt #{examResult.attemptNumber}</p>
          <button onClick={() => { setActiveExam(null); setExamResult(null); setExamQuestions([]); }}
            className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity">
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 border-r border-border h-screen overflow-y-auto flex-shrink-0 bg-card">
          <div className="p-4 border-b border-border">
            <Link href="/student/my-courses" className="text-xs text-primary hover:underline">&larr; My Courses</Link>
            <h2 className="font-bold text-sm mt-2 line-clamp-2">{locale === 'ar' ? (course?.titleAr || course?.title) : course?.title}</h2>
          </div>
          <div className="p-2">
            {sections.map((section: any) => (
              <div key={section.id} className="mb-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  {locale === 'ar' ? (section.titleAr || section.title) : section.title}
                </div>
                {(section.lectures || []).map((lecture: any) => (
                  <button key={lecture.id} onClick={() => { setActiveLecture(lecture); setActiveExam(null); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${activeLecture?.id === lecture.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/30'}`}>
                    <span className="text-xs">{lecture.videoUrl ? '🎬' : '📄'}</span>
                    <span className="truncate">{locale === 'ar' ? (lecture.titleAr || lecture.title) : lecture.title}</span>
                  </button>
                ))}
                {(section.exams || []).map((exam: any) => (
                  <button key={exam.id} onClick={() => handleStartExam(exam)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${activeExam?.id === exam.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/30'}`}>
                    <span className="text-xs">📝</span>
                    <span className="truncate">{locale === 'ar' ? (exam.titleAr || exam.title) : exam.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8 overflow-y-auto h-screen">
          {activeLecture ? (
            <div className="max-w-4xl mx-auto">
              {activeLecture.videoUrl ? (
                <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-6">
                  <LectureVideo src={activeLecture.videoUrl} />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center mb-6">
                  <div className="text-6xl">📄</div>
                </div>
              )}
              <h1 className="text-2xl font-display font-bold mb-4">
                {locale === 'ar' ? (activeLecture.titleAr || activeLecture.title) : activeLecture.title}
              </h1>
              {activeLecture.description && (
                <p className="text-muted-foreground">{locale === 'ar' ? (activeLecture.descriptionAr || activeLecture.description) : activeLecture.description}</p>
              )}
              <QASection lectureId={activeLecture.id} locale={locale} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center py-20">
              <div className="text-6xl mb-4">📖</div>
              <h2 className="text-xl font-bold mb-2">Select a lecture to start learning</h2>
              <p className="text-muted-foreground">Choose a lecture from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

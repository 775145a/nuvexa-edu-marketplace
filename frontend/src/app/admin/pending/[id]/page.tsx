'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { adminApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader, Spinner } from '@/components/ui/Primitives';
import { Textarea } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { formatDate, formatPrice, cn, courseCategoryLabel } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Clock, Layers, PlayCircle, FileQuestion, ClipboardList,
  Users, Star, ShieldCheck, ArrowLeft, Paperclip, ChevronDown,
} from 'lucide-react';

export default function AdminReviewPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [course, setCourse] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'content' | 'exams' | 'assignments'>('content');
  const [openApprove, setOpenApprove] = React.useState(false);
  const [openReject, setOpenReject] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    adminApi.courseDetail(id)
      .then((r) => setCourse(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const submit = async (action: 'APPROVED' | 'REJECTED') => {
    if (action === 'REJECTED' && !reason.trim()) return;
    setSubmitting(true);
    try {
      const r = await adminApi.reviewCourse(id, { action, comments: action === 'REJECTED' ? reason : '' });
      setOpenApprove(false);
      setOpenReject(false);
      router.push(`/admin/pending?done=${r.data?.status === 'APPROVED' ? 'approved' : 'rejected'}`);
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DashboardShell role="ADMIN" title={t.dash.reviewCourse}><PageLoader label={t.common.loading} /></DashboardShell>;
  if (!course) return <DashboardShell role="ADMIN" title={t.dash.reviewCourse}><p className="text-crimson">{t.common.error}</p></DashboardShell>;

  const title = locale === 'ar' ? (course.titleAr || course.title) : course.title;

  return (
    <DashboardShell
      role="ADMIN"
      title={title}
      subtitle={`${t.dash.submittedAt}: ${formatDate(course.submittedForReviewAt || course.updatedAt, 'long')}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" onClick={() => setOpenReject(true)}>
            <XCircle className="h-4 w-4" /> {t.dash.rejectCourse}
          </Button>
          <Button variant="gradient" size="sm" onClick={() => setOpenApprove(true)}>
            <CheckCircle2 className="h-4 w-4" /> {t.dash.approveCourse}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="relative h-52 bg-muted">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl">📖</div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy-950/80 to-transparent" />
              <div className="absolute bottom-4 start-4 end-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning"><Clock className="h-3 w-3" /> {t.dash.pendingCourses}</Badge>
                    <Badge variant="white">{course.level}</Badge>
                    <Badge variant="white">{course.language}</Badge>
                  </div>
                  <h2 className="mt-2 font-display text-xl font-extrabold text-white drop-shadow">{title}</h2>
                </div>
                <span className="font-display text-xl font-extrabold text-white drop-shadow">{formatPrice(course.price || 0)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border rtl:divide-x-reverse sm:grid-cols-4">
              <BigStat icon={<Layers className="h-4 w-4" />} label={t.dash.sections} value={course.sections.length} />
              <BigStat icon={<PlayCircle className="h-4 w-4" />} label={t.dash.lectures} value={course.sections.reduce((s: number, sec: any) => s + sec.lectures.length, 0)} />
              <BigStat icon={<FileQuestion className="h-4 w-4" />} label={t.dash.quizzes} value={course.sections.reduce((s: number, sec: any) => s + sec.exams.length, 0)} />
              <BigStat icon={<ClipboardList className="h-4 w-4" />} label={t.dash.assignments} value={course.sections.reduce((s: number, sec: any) => s + sec.assignments.length, 0)} />
            </div>

            <div className="p-5">
              <h3 className="mb-2 font-display text-sm font-bold">{t.common.description}</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {locale === 'ar' ? (course.descriptionAr || course.description) : course.description || t.common.empty}
              </p>
            </div>
          </Card>

          <div className="flex gap-2">
            {(['content', 'exams', 'assignments'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                  tab === key ? 'border-primary bg-primary text-white shadow-soft' : 'border-border bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                {key === 'content' ? `${t.dash.sections} + ${t.dash.lectures}` : key === 'exams' ? t.dash.quizzes : t.dash.assignments}
              </button>
            ))}
          </div>

          {tab === 'content' && (
            <div className="space-y-4">
              {course.sections.map((section: any, si: number) => (
                <Card key={section.id} className="p-0">
                  <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary/10 text-xs font-bold text-secondary">{si + 1}</span>
                    <p className="flex-1 truncate font-display text-sm font-bold">{section.title}</p>
                    <span className="text-xs text-muted-foreground">{section.lectures.length} {t.dash.lectures}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {section.lectures.map((lecture: any, li: number) => (
                      <div key={lecture.id} className="flex items-start gap-3 px-5 py-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent-700 dark:text-accent-400">
                          <PlayCircle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{li + 1}. {lecture.title}</p>
                          {lecture.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{lecture.description}</p>}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {lecture.videoUrl && <Badge variant="accent"><PlayCircle className="h-3 w-3" /> Video</Badge>}
                            {lecture.duration ? <Badge variant="outline">⏱ {formatDuration(lecture.duration)}</Badge> : null}
                            {lecture.isPreview && <Badge variant="warning">Preview</Badge>}
                          </div>
                          {lecture.resources?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {lecture.resources.map((res: any) => (
                                <div key={res.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Paperclip className="h-3 w-3" /> {res.title || res.fileName || 'Attachment'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {tab === 'exams' && (
            <div className="space-y-4">
              {course.sections.flatMap((s: any) => s.exams).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">{t.common.empty}</p>
              ) : (
                course.sections.map((section: any) =>
                  section.exams.map((exam: any) => (
                    <Card key={exam.id} className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold">{exam.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {section.title} · {exam.questions.length} {t.dash.questions} · {exam.durationMinutes ? `${exam.durationMinutes}m` : ''} · {exam.passScore}% {t.dash.passScore}
                          </p>
                        </div>
                        <Badge variant={exam.isPublished ? 'success' : 'outline'}>{exam.isPublished ? t.dash.published : t.dash.drafts}</Badge>
                      </div>
                      {exam.questions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {exam.questions.map((q: any, qi: number) => (
                            <div key={q.id} className="rounded-xl border border-border bg-muted/30 p-3">
                              <p className="text-sm font-medium">{qi + 1}. {q.questionText || q.question}</p>
                              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                {q.options.map((opt: any) => (
                                  <div key={opt.id} className={cn('flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs', opt.isCorrect ? 'bg-success/10 text-success-700 dark:text-success-400' : 'bg-card text-muted-foreground')}>
                                    <span className={cn('h-1.5 w-1.5 rounded-full', opt.isCorrect ? 'bg-success-500' : 'bg-muted-foreground')} />
                                    {opt.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))
                )
              )}
            </div>
          )}

          {tab === 'assignments' && (
            <div className="space-y-4">
              {course.sections.flatMap((s: any) => s.assignments).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">{t.common.empty}</p>
              ) : (
                course.sections.map((section: any) =>
                  section.assignments.map((assignment: any) => (
                    <Card key={assignment.id} className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">{section.title}</p>
                        </div>
                        <Badge variant="secondary">{assignment.maxScore} pts</Badge>
                      </div>
                      {assignment.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{assignment.description}</p>}
                    </Card>
                  ))
                )
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={course.instructor?.avatarUrl || ''} />
                <AvatarFallback className="bg-gradient-cyan font-bold text-white">{course.instructor?.fullName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold">{course.instructor?.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{course.instructor?.email}</p>
              </div>
              {course.instructor?.instructorProfile?.isVerified && (
                <ShieldCheck className="ms-auto h-5 w-5 text-accent" />
              )}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex items-center justify-between text-muted-foreground"><span>{t.dash.avgRating}</span><span className="flex items-center gap-1 font-semibold text-warning-600"><Star className="h-4 w-4 fill-current" /> {(course.averageRating || 0).toFixed(1)}</span></p>
              <p className="flex items-center justify-between text-muted-foreground"><span>{t.dash.studentsCount}</span><span className="font-semibold">{course._count?.enrollments || 0}</span></p>
              <p className="flex items-center justify-between text-muted-foreground"><span>{t.dash.reviews}</span><span className="font-semibold">{course._count?.reviews || 0}</span></p>
              <p className="flex items-center justify-between text-muted-foreground"><span>{t.dash.orders}</span><span className="font-semibold">{course._count?.orders || 0}</span></p>
              <p className="flex items-center justify-between text-muted-foreground"><span>{t.dash.coursesCount}</span><span className="font-semibold">{course.instructor?._count?.courses || 0}</span></p>
            </div>
          </Card>

          {course.rejectionReason && (
            <Card className="border-crimson/30 bg-crimson/5 p-5">
              <p className="mb-1 flex items-center gap-2 text-sm font-bold text-crimson"><XCircle className="h-4 w-4" /> {t.dash.rejectReason}</p>
              <p className="text-sm">{course.rejectionReason}</p>
            </Card>
          )}

          {course.approvals?.length > 0 && (
            <Card className="p-5">
              <p className="mb-3 font-display text-sm font-bold">History</p>
              <div className="space-y-3">
                {course.approvals.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2.5">
                    <span className={cn('mt-1 h-2 w-2 rounded-full', a.action === 'APPROVED' ? 'bg-success-500' : 'bg-crimson')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{a.action === 'APPROVED' ? t.dash.approved : t.dash.rejected}</p>
                      {a.comments && <p className="text-xs text-muted-foreground">{a.comments}</p>}
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">{formatDate(a.reviewedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <p className="mb-3 font-display text-sm font-bold">Category</p>
            <div className="flex flex-wrap gap-2">
              {course.category ? (
                <Badge variant="secondary">{courseCategoryLabel(course, locale)}</Badge>
              ) : (
                <Badge variant="outline">—</Badge>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dash.approveCourse}</DialogTitle>
            <DialogDescription>{t.dash.approveConfirm}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-xl bg-success/5 p-3 text-sm text-success-700 dark:text-success-400">
            <span className="font-bold">{title}</span> — {course.sections.length} {t.dash.sections}, {course.sections.reduce((s: number, sec: any) => s + sec.lectures.length, 0)} {t.dash.lectures}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenApprove(false)} disabled={submitting}>{t.common.cancel}</Button>
            <Button variant="emerald" onClick={() => submit('APPROVED')} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : <CheckCircle2 className="h-4 w-4" />} {t.dash.approveCourse}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openReject} onOpenChange={setOpenReject}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dash.rejectCourse}</DialogTitle>
            <DialogDescription>{t.dash.rejectHint}</DialogDescription>
          </DialogHeader>
          <div className="mt-3">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.dash.rejectHint}
              className={cn(!reason.trim() && 'border-crimson/40')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReject(false)} disabled={submitting}>{t.common.cancel}</Button>
            <Button variant="destructive" onClick={() => submit('REJECTED')} disabled={submitting || !reason.trim()}>
              {submitting ? <Spinner size="sm" /> : <XCircle className="h-4 w-4" />} {t.dash.rejectCourse}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function BigStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
      <div className="text-foreground/60">{icon}</div>
      <p className="font-display text-lg font-bold leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

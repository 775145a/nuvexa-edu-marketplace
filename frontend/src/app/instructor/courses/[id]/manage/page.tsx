'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { courseApi, sectionApi, lectureApi, storageApi, categoryApi, videoJobApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input, Textarea, Field } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader, Spinner } from '@/components/ui/Primitives';
import { ProgressBar } from '@/components/ui/DataDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { formatDate, cn } from '@/lib/utils';
import {
  Plus, Trash2, ChevronDown, ChevronUp, PlayCircle, Upload, FileText, Clock,
  Lock, AlertTriangle, CheckCircle2, Send, Link2, Eye, FolderPlus, Image as ImageIcon, Paperclip,
} from 'lucide-react';

export default function CourseManagePage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [uploadingThumb, setUploadingThumb] = React.useState(false);
  const [openSubmit, setOpenSubmit] = React.useState(false);
  const [openRejected, setOpenRejected] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());
  const [newSectionTitle, setNewSectionTitle] = React.useState('');
  const [addingSection, setAddingSection] = React.useState(false);
  const [newLectureTitle, setNewLectureTitle] = React.useState('');
  const [addingLectureTo, setAddingLectureTo] = React.useState<string | null>(null);
  const [processingVideo, setProcessingVideo] = React.useState<{ lectureId: string; jobId: string } | null>(null);

  const locked = course?.status === 'PENDING_REVIEW';
  const OTHER = '__other__';
  const isOtherCat = !!(course && (course.category?.slug === 'other' || course.categoryId === OTHER));

  const load = React.useCallback(async () => {
    const res = await courseApi.getManage(courseId).catch(() => null);
    if (res?.data) {
      setCourse(res.data);
      setExpandedSections((prev) => {
        const next = new Set(prev);
        res.data.sections.forEach((s: any) => next.add(s.id));
        return next;
      });
    }
  }, [courseId]);

  React.useEffect(() => {
    categoryApi.list().then((r) => setCategories(r.data || [])).catch(() => {});
    Promise.all([courseApi.getManage(courseId).catch(() => null)])
      .then(([res]) => {
        if (res?.data) {
          setCourse(res.data);
          setExpandedSections(new Set(res.data.sections.map((s: any) => s.id)));
        }
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  const updateCourse = async (patch: any) => {
    setSaving(true);
    try {
      const res = await courseApi.update(courseId, patch);
      setCourse((prev: any) => ({ ...prev, ...res.data }));
    } catch (err: any) {
      if (err.message?.includes('review')) router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleThumbnail = async (file: File) => {
    setUploadingThumb(true);
    try {
      const data = await storageApi.upload(file, 'course-thumbnail');
      await updateCourse({ thumbnailUrl: data.url });
    } catch {} finally {
      setUploadingThumb(false);
    }
  };

  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    setAddingSection(true);
    try {
      await sectionApi.create(courseId, { title: newSectionTitle.trim(), order: course.sections.length });
      setNewSectionTitle('');
      await load();
    } catch {} finally {
      setAddingSection(false);
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm(t.dash.deleteSection)) return;
    try { await sectionApi.delete(id); await load(); } catch {}
  };

  const addLecture = async (sectionId: string) => {
    if (!newLectureTitle.trim()) return;
    try {
      const section = course.sections.find((s: any) => s.id === sectionId);
      await sectionApi.addLecture(sectionId, { title: newLectureTitle.trim(), order: (section?.lectures?.length || 0) });
      setNewLectureTitle('');
      setAddingLectureTo(null);
      await load();
    } catch {}
  };

  const updateLecture = async (lecture: any, patch: any) => {
    try {
      const res = await lectureApi.update(lecture.id, patch);
      await load();
    } catch {}
  };

  const deleteLecture = async (id: string) => {
    if (!confirm(t.dash.deleteLecture)) return;
    try { await lectureApi.delete(id); await load(); } catch {}
  };

  const uploadLectureVideo = async (lecture: any, file: File) => {
    try {
      const data = await storageApi.upload(file, 'course-lecture', () => {}, { transcode: 'true' });
      const duration = data.hls?.duration || 0;
      const patch: any = {
        videoUrl: data.url,
        videoStorageKey: data.key,
        duration: Math.round(duration),
        fileName: data.fileName,
        fileSize: data.size,
        mimeType: data.mimeType,
      };
      if (data.hls?.posterUrl) patch.thumbnailUrl = data.hls.posterUrl;
      await updateLecture(lecture, patch);

      if (data.videoJob?.id) {
        const jobId = data.videoJob.id;
        setProcessingVideo({ lectureId: lecture.id, jobId });
        await pollVideoJob(lecture, jobId);
      }
    } catch {}
  };

  const pollVideoJob = async (lecture: any, jobId: string, tries = 0) => {
    try {
      const r = await videoJobApi.get(jobId);
      const job = r.data;
      if (job.status === 'COMPLETED') {
        await updateLecture(lecture, {
          videoUrl: job.resultUrl || undefined,
          thumbnailUrl: job.posterUrl || undefined,
          duration: Math.round(job.duration || 0),
        });
        setProcessingVideo(null);
        return;
      }
      if (job.status === 'FAILED') {
        setProcessingVideo(null);
        return;
      }
      if (tries < 60) {
        setTimeout(() => pollVideoJob(lecture, jobId, tries + 1), 3000);
      } else {
        setProcessingVideo(null);
      }
    } catch {
      if (tries < 60) setTimeout(() => pollVideoJob(lecture, jobId, tries + 1), 3000);
      else setProcessingVideo(null);
    }
  };

  const uploadLectureThumb = async (lecture: any, file: File) => {
    try {
      const data = await storageApi.upload(file, 'lecture-thumbnail');
      await updateLecture(lecture, { thumbnailUrl: data.url });
    } catch {}
  };

  const addResource = async (lecture: any, file: File) => {
    try {
      const data = await storageApi.upload(file, 'lecture-resource');
      await lectureApi.addResource(lecture.id, {
        title: data.fileName,
        fileName: data.fileName,
        storageKey: data.key,
        fileUrl: data.url,
        fileType: data.mimeType,
        fileSize: data.size,
        mimeType: data.mimeType,
      });
      await load();
    } catch {}
  };

  const submitReview = async () => {
    setSaving(true);
    try {
      await courseApi.submitReview(courseId);
      setOpenSubmit(false);
      router.refresh();
      await load();
    } catch (err: any) {
      alert(err.message || t.common.error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardShell role="INSTRUCTOR" title={t.instructor.myCourses}><PageLoader label={t.common.loading} /></DashboardShell>;
  if (!course) return <DashboardShell role="INSTRUCTOR" title={t.instructor.myCourses}><p className="text-crimson">{t.common.error}</p></DashboardShell>;

  const title = locale === 'ar' ? (course.titleAr || course.title) : course.title;
  const totalLectures = course.sections.reduce((s: number, sec: any) => s + sec.lectures.length, 0);
  const totalDuration = course.sections.reduce((s: number, sec: any) => s + sec.lectures.reduce((x: number, l: any) => x + (l.duration || 0), 0), 0);
  const hasVideo = course.sections.every((sec: any) => sec.lectures.every((l: any) => l.videoUrl));
  const ready = !!(course.title && course.description && course.price && course.categoryId && course.sections.length > 0 && totalLectures > 0 && (!isOtherCat || course.customFieldAr));

  return (
    <DashboardShell
      role="INSTRUCTOR"
      title={t.dash.editCourse}
      subtitle={course.status === 'APPROVED' ? t.dash.courseApprovedDesc : course.status === 'REJECTED' ? t.dash.courseRejectedDesc : t.dash.courseSubmittedDesc}
      actions={
        course.status === 'PENDING_REVIEW' ? (
          <Badge variant="warning" className="px-3 py-1.5"><Lock className="h-3.5 w-3.5" /> {t.dash.courseUnderReview}</Badge>
        ) : (
          <Button variant="gradient" size="sm" onClick={() => setOpenSubmit(true)} disabled={!ready}>
            <Send className="h-4 w-4" /> {t.dash.submitForReview}
          </Button>
        )
      }
    >
      {/* Status banners */}
      {course.status === 'PENDING_REVIEW' && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <div>
            <p className="font-display text-sm font-bold">{t.dash.courseUnderReview}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t.dash.courseUnderReviewDesc}</p>
            {course.submittedForReviewAt && (
              <p className="mt-1 text-xs text-muted-foreground/70">{t.dash.submittedAt}: {formatDate(course.submittedForReviewAt, 'long')}</p>
            )}
          </div>
        </div>
      )}

      {course.status === 'REJECTED' && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-crimson/30 bg-crimson/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-crimson" />
          <div className="flex-1">
            <p className="font-display text-sm font-bold">{t.dash.courseRejected}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t.dash.courseRejectedDesc}</p>
            {course.rejectionReason && (
              <div className="mt-2 rounded-xl border border-crimson/20 bg-card p-3 text-sm">
                <span className="font-semibold text-crimson">{t.dash.rejectReason}: </span>{course.rejectionReason}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="gradient" onClick={() => setOpenSubmit(true)} disabled={!ready}>
                <Send className="h-3.5 w-3.5" /> {t.dash.resubmit}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpenRejected(true)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> {t.dash.reviewCourse}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Course details */}
        <div className="space-y-6 xl:col-span-1">
          <Card className="p-5">
            <CardHeader className="p-0 pb-4">
              <CardTitle>{t.courses.title}</CardTitle>
              <CardDescription>{t.dash.submitForReview}</CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <Field label={`${t.courses.title} (EN)`} required>
                <Input value={course.title || ''} disabled={locked} onChange={(e) => setCourse({ ...course, title: e.target.value })} onBlur={(e) => e.target.value !== course.title && updateCourse({ title: e.target.value })} />
              </Field>
              <Field label={`${t.courses.title} (AR)`}>
                <Input value={course.titleAr || ''} disabled={locked} onChange={(e) => setCourse({ ...course, titleAr: e.target.value })} onBlur={(e) => updateCourse({ titleAr: e.target.value })} />
              </Field>
              <Field label={t.courses.description}>
                <Input value={course.shortDescription || ''} disabled={locked} onChange={(e) => setCourse({ ...course, shortDescription: e.target.value })} onBlur={(e) => updateCourse({ shortDescription: e.target.value })} />
              </Field>
              <Field label={t.courses.fullDescription} required>
                <Textarea rows={4} value={course.description || ''} disabled={locked} onChange={(e) => setCourse({ ...course, description: e.target.value })} onBlur={(e) => updateCourse({ description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.courses.price} required>
                  <Input type="number" min="0" step="0.01" value={course.price ?? ''} disabled={locked} onChange={(e) => setCourse({ ...course, price: e.target.value })} onBlur={(e) => updateCourse({ price: parseFloat(e.target.value) || 0 })} />
                </Field>
                <Field label={t.dash.avgRating}>
                  <select
                    value={course.level || 'ALL_LEVELS'}
                    disabled={locked}
                    onChange={(e) => updateCourse({ level: e.target.value })}
                    className="h-10 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/60 disabled:opacity-50"
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
                  value={isOtherCat ? OTHER : (course.categoryId || '')}
                  disabled={locked}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === OTHER) updateCourse({ categoryId: OTHER });
                    else updateCourse({ categoryId: v, customFieldAr: null, customFieldEn: null });
                  }}
                  className="h-10 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/60 disabled:opacity-50"
                >
                  <option value="">{t.common.select}</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{locale === 'ar' ? (cat.nameAr || cat.name) : cat.name}</option>
                  ))}
                  <option value={OTHER}>{t.courses.otherCategory}</option>
                </select>
              </Field>

              {isOtherCat && (
                <div className="space-y-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
                  <Field label={t.courses.customFieldAr} required>
                    <Input value={course.customFieldAr || ''} disabled={locked} onChange={(e) => setCourse({ ...course, customFieldAr: e.target.value })} onBlur={(e) => updateCourse({ customFieldAr: e.target.value })} placeholder="مثال: البرمجة الروبوتية" dir="rtl" />
                  </Field>
                  <Field label={t.courses.customFieldEn}>
                    <Input value={course.customFieldEn || ''} disabled={locked} onChange={(e) => setCourse({ ...course, customFieldEn: e.target.value })} onBlur={(e) => updateCourse({ customFieldEn: e.target.value })} placeholder="e.g. Robotics Programming" dir="ltr" />
                    <p className="mt-1 text-xs text-muted-foreground">{t.courses.customFieldOptional}</p>
                  </Field>
                </div>
              )}
              {saving && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Spinner size="sm" /> {t.common.saving}</p>}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader className="p-0 pb-4">
              <CardTitle>{t.dash.thumbnailUpload}</CardTitle>
              <CardDescription>Recommended 1280×720</CardDescription>
            </CardHeader>
            <div className="relative overflow-hidden rounded-xl border border-dashed border-border">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted/40 text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              {uploadingThumb && (
                <div className="absolute inset-0 flex items-center justify-center bg-navy-950/50">
                  <Spinner className="text-white" />
                </div>
              )}
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
              <Upload className="h-4 w-4" /> {t.dash.uploadComplete}
              <input
                type="file"
                accept="image/*"
                disabled={locked}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnail(f); e.target.value = ''; }}
              />
            </label>
          </Card>

          <Card className="p-5">
            <p className="mb-3 font-display text-sm font-bold">{t.common.actions}</p>
            <div className="flex flex-col gap-2">
              <Link href={`/instructor/courses/${courseId}/manage/exams`}>
                <Button variant="outline" className="w-full" disabled={locked}><FileText className="h-4 w-4" /> {t.dash.quizzes}</Button>
              </Link>
              <Link href={`/courses/${course.slug}`}>
                <Button variant="ghost" className="w-full"><Eye className="h-4 w-4" /> {t.dash.viewCourse}</Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Curriculum */}
        <div className="space-y-5 xl:col-span-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label={t.dash.sections} value={course.sections.length} />
            <MiniStat label={t.dash.lectures} value={totalLectures} />
            <MiniStat label={t.dash.videosCount} value={totalLectures} />
            <MiniStat label={t.dash.durationLabel} value={formatClock(totalDuration)} />
          </div>

          <Card className="p-5">
            <CardHeader className="p-0 pb-4">
              <CardTitle>{t.dash.sectionTitle}</CardTitle>
              <CardDescription>{t.dash.noSectionsDesc}</CardDescription>
            </CardHeader>
            <div className="space-y-4">
              {course.sections.length === 0 && (
                <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{t.dash.noSections}</p>
              )}

              {course.sections.map((section: any, si: number) => {
                const expanded = expandedSections.has(section.id);
                return (
                  <div key={section.id} className="overflow-hidden rounded-2xl border border-border">
                    <div className="flex items-center gap-3 bg-muted/40 px-4 py-3">
                      <button
                        onClick={() => setExpandedSections((prev) => { const n = new Set(prev); if (n.has(section.id)) n.delete(section.id); else n.add(section.id); return n; })}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary/10 text-xs font-bold text-secondary">{si + 1}</span>
                      <p className="min-w-0 flex-1 truncate font-semibold">{section.title}</p>
                      <Badge variant="outline">{section.lectures.length} {t.dash.lectures}</Badge>
                      {!locked && (
                        <button onClick={() => deleteSection(section.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-crimson/10 hover:text-crimson">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {expanded && (
                      <div className="divide-y divide-border">
                        {section.lectures.map((lecture: any, li: number) => (
                          <LectureRow
                            key={lecture.id}
                            index={li}
                            lecture={lecture}
                            locked={locked}
                            t={t}
                            onUpdate={(patch) => updateLecture(lecture, patch)}
                            onDelete={() => deleteLecture(lecture.id)}
                            onVideo={(file) => uploadLectureVideo(lecture, file)}
                            onThumb={(file) => uploadLectureThumb(lecture, file)}
                            onResource={(file) => addResource(lecture, file)}
                            processing={processingVideo?.lectureId === lecture.id}
                            locale={locale}
                          />
                        ))}

                        {addingLectureTo === section.id ? (
                          <div className="flex items-center gap-2 bg-card px-4 py-3">
                            <Input
                              value={newLectureTitle}
                              onChange={(e) => setNewLectureTitle(e.target.value)}
                              placeholder={t.dash.lectureTitle}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && addLecture(section.id)}
                            />
                            <Button size="sm" variant="gradient" onClick={() => addLecture(section.id)} disabled={!newLectureTitle.trim()}>
                              <Plus className="h-3.5 w-3.5" /> {t.common.add}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingLectureTo(null)}>✕</Button>
                          </div>
                        ) : (
                          !locked && (
                            <div className="px-4 py-3">
                              <Button variant="ghost" size="sm" onClick={() => { setAddingLectureTo(section.id); setNewLectureTitle(''); }} className="w-full border border-dashed border-border">
                                <Plus className="h-4 w-4" /> {t.dash.addLecture}
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {!locked && (
                <div className="flex items-center gap-2">
                  <Input
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder={t.dash.sectionTitle}
                    onKeyDown={(e) => e.key === 'Enter' && addSection()}
                  />
                  <Button variant="gradient" onClick={addSection} disabled={addingSection || !newSectionTitle.trim()}>
                    {addingSection ? <Spinner size="sm" /> : <FolderPlus className="h-4 w-4" />} {t.dash.addSection}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader className="p-0 pb-3">
              <CardTitle>{t.dash.submitForReview}</CardTitle>
            </CardHeader>
            <ul className="space-y-2 text-sm">
              <CheckItem ok={!!(course.title && course.description && course.price && course.categoryId && (!isOtherCat || course.customFieldAr))} label={t.dash.submitForReview} />
              <CheckItem ok={course.sections.length > 0} label={t.dash.addSection} />
              <CheckItem ok={totalLectures > 0} label={t.dash.addLecture} />
              <CheckItem ok={hasVideo} label={t.dash.videoUpload} />
            </ul>
          </Card>
        </div>
      </div>

      {/* Submit modal */}
      <Dialog open={openSubmit} onOpenChange={setOpenSubmit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dash.submitForReview}</DialogTitle>
            <DialogDescription>{t.dash.courseSubmittedDesc}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-2 text-sm">
            <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success-500" /> {t.dash.courseSubmitted}</p>
            <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <span className="font-bold">{title}</span> · {course.sections.length} {t.dash.sections} · {totalLectures} {t.dash.lectures}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSubmit(false)}>{t.common.cancel}</Button>
            <Button variant="gradient" onClick={submitReview} disabled={saving}>
              {saving ? <Spinner size="sm" /> : <Send className="h-4 w-4" />} {t.dash.submitForReview}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejected review modal */}
      <Dialog open={openRejected} onOpenChange={setOpenRejected}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dash.courseRejected}</DialogTitle>
            <DialogDescription>{t.dash.courseRejectedDesc}</DialogDescription>
          </DialogHeader>
          {course.rejectionReason && (
            <div className="mt-2 rounded-xl border border-crimson/20 bg-crimson/5 p-3 text-sm">{course.rejectionReason}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRejected(false)}>{t.common.cancel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn('flex h-5 w-5 items-center justify-center rounded-full', ok ? 'bg-success/10 text-success-600' : 'bg-muted text-muted-foreground')}>
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      </span>
      <span className={ok ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}

function LectureRow({ index, lecture, locked, t, onUpdate, onDelete, onVideo, onThumb, onResource, processing, locale }: {
  index: number;
  lecture: any;
  locked: boolean;
  t: any;
  onUpdate: (patch: any) => void;
  onDelete: () => void;
  onVideo: (file: File) => void;
  onThumb: (file: File) => void;
  onResource: (file: File) => void;
  processing: boolean;
  locale: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [uploadingResource, setUploadingResource] = React.useState(false);

  const handleVideo = async (file: File) => {
    setUploading(true);
    setProgress(0);
    try {
      await onVideo(file);
    } catch {} finally {
      setUploading(false);
    }
  };

  const handleResource = async (file: File) => {
    setUploadingResource(true);
    try { await onResource(file); } catch {} finally {
      setUploadingResource(false);
    }
  };

  return (
    <div className="flex items-start gap-3 bg-card px-4 py-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent-700 dark:text-accent-400">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <Input
              defaultValue={lecture.title}
              autoFocus
              onBlur={(e) => { onUpdate({ title: e.target.value }); setEditing(false); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            <Textarea
              defaultValue={lecture.description || ''}
              rows={2}
              onBlur={(e) => onUpdate({ description: e.target.value })}
              placeholder={t.dash.lectureDescription}
            />
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-secondary hover:underline">
                <Eye className="h-3.5 w-3.5" /> Preview
                <input type="checkbox" checked={!!lecture.isPreview} onChange={(e) => onUpdate({ isPreview: e.target.checked })} />
              </label>
            </div>
          </div>
        ) : (
          <p className="truncate text-sm font-semibold" onClick={() => !locked && setEditing(true)}>{lecture.title}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {processing ? (
            <span className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Spinner size="sm" /> {t.dash.processingVideo}
            </span>
          ) : lecture.videoUrl ? (
            <Badge variant="success"><PlayCircle className="h-3 w-3" /> {lecture.duration ? formatClock(lecture.duration) : t.dash.uploadComplete}</Badge>
          ) : uploading ? (
            <span className="flex items-center gap-2 text-xs text-secondary">
              <Spinner size="sm" /> {t.dash.uploading} {progress}%
            </span>
          ) : (
            <label className={cn('flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors', locked ? 'cursor-not-allowed text-muted-foreground' : 'bg-accent/10 text-accent-700 hover:bg-accent/20 dark:text-accent-400')}>
              <Upload className="h-3 w-3" /> {t.dash.videoUpload}
              <input
                type="file"
                accept="video/*"
                disabled={locked}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideo(f); e.target.value = ''; }}
              />
            </label>
          )}

          <label className={cn('flex cursor-pointer items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-muted/70', locked && 'cursor-not-allowed')}>
            <Paperclip className="h-3 w-3" /> {t.dash.attachFile}
            <input type="file" disabled={locked} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResource(f); e.target.value = ''; }} />
          </label>

          {lecture.resources?.length > 0 && (
            <Badge variant="outline">{lecture.resources.length} {t.dash.attachmentUpload}</Badge>
          )}

          {!locked && (
            <>
              <button onClick={() => setEditing(!editing)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                <FileText className="h-3.5 w-3.5" />
              </button>
              <button onClick={onDelete} className="rounded-lg p-1 text-muted-foreground hover:bg-crimson/10 hover:text-crimson">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatClock(seconds: number): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

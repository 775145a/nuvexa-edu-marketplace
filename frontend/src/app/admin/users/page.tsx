'use client';

import * as React from 'react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { adminApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { StatCard } from '@/components/ui/DataDisplay';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Primitives';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { formatDate, formatPrice, cn, getStatusBadge } from '@/lib/utils';
import {
  Users, GraduationCap, BookOpen, ShieldCheck, Search, Power, BadgeCheck, Phone,
  Eye, Mail, Star, Wallet, ShoppingBag, X, Clock,
} from 'lucide-react';

const ROLE_STYLES: Record<string, { label: string; gradient: string; variant: any }> = {
  ADMIN: { label: 'Admin', gradient: 'bg-gradient-purple', variant: 'secondary' },
  INSTRUCTOR: { label: 'Instructor', gradient: 'bg-gradient-cyan', variant: 'accent' },
  STUDENT: { label: 'Student', gradient: 'bg-gradient-emerald', variant: 'outline' },
};

const COLOR_TO_VARIANT: Record<string, any> = {
  gray: 'default',
  amber: 'warning',
  emerald: 'success',
  red: 'destructive',
  blue: 'primary',
  purple: 'secondary',
};

export default function AdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const [detail, setDetail] = React.useState<any>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);

  React.useEffect(() => {
    adminApi.users().then((r) => setUsers(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const r = await adminApi.userDetail(id);
      setDetail(r.data);
    } catch {}
    setDetailLoading(false);
  };

  const toggleStatus = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await adminApi.toggleUserStatus(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)));
      if (detail?.id === id) setDetail((d: any) => ({ ...d, isActive: !d.isActive }));
    } catch {}
  };

  const counts = {
    total: users.length,
    students: users.filter((u) => u.role === 'STUDENT').length,
    instructors: users.filter((u) => u.role === 'INSTRUCTOR').length,
    active: users.filter((u) => u.isActive).length,
  };

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (u.fullName || '').toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
      || (u.phone || '').toLowerCase().includes(q);
  });

  return (
    <DashboardShell role="ADMIN" title={t.dash.users} subtitle={`${counts.total} ${t.dash.users}`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t.dash.users} value={counts.total} icon={<Users className="h-5 w-5" />} accent="primary" loading={loading} />
        <StatCard label={t.dash.studentsCount} value={counts.students} icon={<GraduationCap className="h-5 w-5" />} accent="accent" />
        <StatCard label={t.dash.instructors} value={counts.instructors} icon={<BookOpen className="h-5 w-5" />} accent="secondary" />
        <StatCard label={t.dash.activeSessions} value={counts.active} icon={<ShieldCheck className="h-5 w-5" />} accent="success" />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.common.search}
            className="h-10 w-full rounded-xl border border-input bg-card ps-9 pe-3.5 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/60 md:w-72"
          />
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">{filtered.length} {t.dash.users}</p>
      </div>

      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : (
        <Card className="mt-4 overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <div className="col-span-3">{t.common.name}</div>
            <div className="col-span-2">{t.common.email}</div>
            <div className="col-span-2">{t.dash.phoneLabel}</div>
            <div className="col-span-1 text-center">{t.common.role}</div>
            <div className="col-span-2 text-center">{t.dash.joinedAt}</div>
            <div className="col-span-1 text-center">{t.common.status}</div>
            <div className="col-span-1 text-end">{t.common.actions}</div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((user: any) => {
              const role = ROLE_STYLES[user.role] || ROLE_STYLES.STUDENT;
              return (
                <div
                  key={user.id}
                  onClick={() => openDetail(user.id)}
                  className="grid cursor-pointer grid-cols-1 items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30 md:grid-cols-12"
                >
                  <div className="col-span-3 flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl || ''} />
                      <AvatarFallback className={cn('text-xs font-bold text-white', role.gradient)}>{user.fullName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {user.fullName}
                        {user.instructorProfile?.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-accent" />}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.studentProfile?.country || user.instructorProfile?.headline || formatDate(user.createdAt)}</p>
                    </div>
                  </div>

                  <div className="col-span-2 truncate text-sm text-muted-foreground">{user.email}</div>

                  <div className="col-span-2 truncate text-sm" dir="ltr">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2 py-1 font-medium">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {user.phone || '—'}
                    </span>
                  </div>

                  <div className="col-span-1 text-center">
                    <Badge variant={role.variant}>{user.role}</Badge>
                  </div>

                  <div className="col-span-2 text-center text-xs text-muted-foreground">{formatDate(user.createdAt)}</div>

                  <div className="col-span-1 text-center">
                    <span className={cn('inline-flex h-2.5 w-2.5 rounded-full', user.isActive ? 'bg-success-500' : 'bg-crimson')} />
                  </div>

                  <div className="col-span-1 flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openDetail(user.id); }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant={user.isActive ? 'dangerOutline' : 'emerald'} onClick={(e: React.MouseEvent) => toggleStatus(user.id, e)}>
                      <Power className="h-3.5 w-3.5" /> {user.isActive ? t.admin.deactivate : t.admin.activate}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">{t.common.noData}</p>}
        </Card>
      )}

      <UserDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        detail={detail}
        loading={detailLoading}
        onToggle={(e: React.MouseEvent) => detail && toggleStatus(detail.id, e)}
      />
    </DashboardShell>
  );
}

function UserDetailDialog({
  open, onOpenChange, detail, loading, onToggle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  detail: any;
  loading: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const { t } = useI18n();
  if (!detail && !loading) return null;
  const role = ROLE_STYLES[detail?.role] || ROLE_STYLES.STUDENT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.admin.userDetails}</DialogTitle>
        </DialogHeader>

        {loading || !detail ? (
          <div className="space-y-4 py-6">
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton h-48 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center">
              <Avatar className="h-14 w-14">
                <AvatarImage src={detail.avatarUrl || ''} />
                <AvatarFallback className={cn('text-lg font-bold text-white', role.gradient)}>{detail.fullName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold">{detail.fullName}</h3>
                  <Badge variant={role.variant}>{detail.role}</Badge>
                  {detail.instructorProfile?.isVerified && <BadgeCheck className="h-4 w-4 text-accent" />}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{detail.email}</span>
                  {detail.phone && (
                    <span className="inline-flex items-center gap-1.5" dir="ltr"><Phone className="h-3.5 w-3.5" />{detail.phone}</span>
                  )}
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatDate(detail.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', detail.isActive ? 'bg-success-500' : 'bg-crimson')} />
                <span className="text-xs font-medium">{detail.isActive ? t.admin.activate : t.admin.deactivate}</span>
                <Button size="sm" variant={detail.isActive ? 'dangerOutline' : 'emerald'} onClick={onToggle}>
                  <Power className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {detail.role === 'INSTRUCTOR' ? (
              <InstructorDetail t={t} detail={detail} />
            ) : detail.role === 'STUDENT' ? (
              <StudentDetail t={t} detail={detail} />
            ) : (
              <div className="rounded-2xl border border-border/70 p-4 text-sm text-muted-foreground">
                {t.dash.users}: {detail._count?.users ?? detail.stats?._count?.users ?? '—'}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              <X className="h-4 w-4" /> {t.admin.close}
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailChip({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={cn('text-secondary', accent)}>{icon}</span>
        {label}
      </div>
      <p className="font-display text-lg font-extrabold">{value}</p>
    </div>
  );
}

function InstructorDetail({ t, detail }: { t: any; detail: any }) {
  const s = detail.stats;
  const courses = detail.courses || [];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DetailChip icon={<BookOpen className="h-4 w-4" />} label={t.instructor.totalCourses} value={String(s.courseCount ?? 0)} />
        <DetailChip icon={<Users className="h-4 w-4" />} label={t.instructor.totalStudents} value={String(s.totalStudents ?? 0)} />
        <DetailChip icon={<Wallet className="h-4 w-4" />} label={t.dash.totalRevenue} value={formatPrice(s.totalRevenue ?? 0)} />
        <DetailChip icon={<ShoppingBag className="h-4 w-4" />} label={t.admin.salesCount} value={String(s.salesCount ?? 0)} />
        <DetailChip icon={<Star className="h-4 w-4" />} label={t.instructor.averageRating} value={String(s.averageRating ?? 0)} />
        <DetailChip icon={<BookOpen className="h-4 w-4" />} label={t.admin.approved} value={String(s.approvedCount ?? 0)} />
        <DetailChip icon={<Clock className="h-4 w-4" />} label={t.admin.pendingReview} value={String(s.pendingCount ?? 0)} />
        <DetailChip icon={<Wallet className="h-4 w-4" />} label={t.admin.payout} value={formatPrice(s.pendingPayout ?? 0)} />
      </div>

      <div>
        <h4 className="mb-2 font-display text-sm font-bold">{t.admin.userCourses} ({courses.length})</h4>
        {courses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{t.common.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-start font-semibold">{t.common.title}</th>
                  <th className="px-4 py-2.5 text-center font-semibold">{t.common.status}</th>
                  <th className="px-4 py-2.5 text-center font-semibold">{t.dash.studentsCount}</th>
                  <th className="px-4 py-2.5 text-center font-semibold">{t.courses.rating}</th>
                  <th className="px-4 py-2.5 text-center font-semibold">{t.dash.totalRevenue}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {courses.map((c: any) => {
                  const st = getStatusBadge(c.status);
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-muted/20">
                      <td className="max-w-[220px] truncate px-4 py-2.5 font-medium">{c.title}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={COLOR_TO_VARIANT[st.color] || 'default'}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center">{c.enrollmentCount ?? 0}</td>
                      <td className="px-4 py-2.5 text-center">{(c.averageRating ?? 0).toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{formatPrice(c.totalRevenue ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function StudentDetail({ t, detail }: { t: any; detail: any }) {
  const s = detail.stats;
  const enrollments = detail.activity?.enrollments || [];
  const orders = detail.activity?.orders || [];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DetailChip icon={<Wallet className="h-4 w-4" />} label={t.admin.totalSpent} value={formatPrice(s.totalSpent ?? 0)} />
        <DetailChip icon={<ShoppingBag className="h-4 w-4" />} label={t.dash.orders} value={String(s.completedOrders ?? 0)} />
        <DetailChip icon={<GraduationCap className="h-4 w-4" />} label={t.admin.enrolledCourses} value={String(detail._count?.enrollments ?? enrollments.length)} />
        <DetailChip icon={<Star className="h-4 w-4" />} label={t.courses.reviews} value={String(detail._count?.reviews ?? 0)} />
      </div>

      <div>
        <h4 className="mb-2 font-display text-sm font-bold">{t.admin.enrolledCourses} ({enrollments.length})</h4>
        {enrollments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">{t.admin.noEnrollments}</p>
        ) : (
          <div className="grid gap-2">
            {enrollments.map((en: any) => (
              <div key={en.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary-soft text-secondary">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{en.course?.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{en.course?.instructor?.fullName} · {formatDate(en.enrolledAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 font-display text-sm font-bold">{t.dash.orders} ({orders.length})</h4>
        {orders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">{t.admin.noOrders}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-start font-semibold">{t.common.title}</th>
                  <th className="px-4 py-2.5 text-center font-semibold">{t.common.status}</th>
                  <th className="px-4 py-2.5 text-center font-semibold">{t.common.total}</th>
                  <th className="px-4 py-2.5 text-center font-semibold">{t.dash.joinedAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o: any) => (
                  <tr key={o.id} className="transition-colors hover:bg-muted/20">
                    <td className="max-w-[220px] truncate px-4 py-2.5 font-medium">
                      {o.items?.map((i: any) => i.course?.title).filter(Boolean).join(', ') || o.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={o.status === 'COMPLETED' ? 'success' : o.status === 'AWAITING_CONFIRMATION' ? 'warning' : 'outline'}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold">{formatPrice(o.total ?? 0)}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

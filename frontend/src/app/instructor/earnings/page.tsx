'use client';

import * as React from 'react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { instructorApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { StatCard } from '@/components/ui/DataDisplay';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Primitives';
import { ChartCard, RevenueAreaChart, BarsChart } from '@/components/ui/Charts';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { formatPrice, formatDate } from '@/lib/utils';
import { Wallet, TrendingUp, Users, Star, Banknote, GraduationCap, ArrowLeft } from 'lucide-react';

export default function EarningsPage() {
  const { t } = useI18n();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    instructorApi.dashboard()
      .then((d) => setData(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardShell role="INSTRUCTOR" title={t.dash.earnings}><PageLoader label={t.common.loading} /></DashboardShell>;
  if (!data) return <DashboardShell role="INSTRUCTOR" title={t.dash.earnings}><p className="text-crimson">{t.common.error}</p></DashboardShell>;

  const s = data.stats;
  const commissionRate = s.totalRevenue > 0 ? (s.pendingPayout / s.totalRevenue) * 100 : 0;

  return (
    <DashboardShell
      role="INSTRUCTOR"
      title={t.dash.earnings}
      subtitle={`${s.salesCount} ${t.dash.orders} · ${s.totalStudents} ${t.dash.students}`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t.instructor.totalEarnings} value={formatPrice(s.totalRevenue)} icon={<Wallet className="h-5 w-5" />} accent="success" />
        <StatCard label={t.dash.pendingPayout} value={formatPrice(s.pendingPayout)} icon={<Banknote className="h-5 w-5" />} accent="warning" />
        <StatCard label={t.dash.totalSales} value={s.salesCount} icon={<TrendingUp className="h-5 w-5" />} accent="accent" />
        <StatCard label={t.dash.avgRating} value={s.averageRating ? s.averageRating.toFixed(1) : '—'} icon={<Star className="h-5 w-5" />} accent="crimson" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title={t.dash.revenueTrend} subtitle={`Last 14 days · commission ${Math.round(commissionRate)}%`} className="xl:col-span-2">
          <RevenueAreaChart data={data.revenueSeries} formatter={(v) => formatPrice(v).replace('.00', '')} />
        </ChartCard>

        <ChartCard title={t.dash.orders} subtitle="Daily sales (14d)">
          <BarsChart
            data={data.revenueSeries.map((d: any) => ({ name: d.date.slice(5), value: d.sales }))}
            dataKey="value"
            name={t.dash.orders}
          />
        </ChartCard>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t.dash.latestSales}</CardTitle>
          <CardDescription>Recent completed orders</CardDescription>
        </CardHeader>
        <CardContent>
          {data.latestSales.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.common.empty}</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground rtl:text-right">
                    <th className="px-4 py-3 font-semibold">{t.dash.students}</th>
                    <th className="px-4 py-3 font-semibold">{t.dash.coursesCount}</th>
                    <th className="px-4 py-3 font-semibold">{t.common.actions}</th>
                    <th className="px-4 py-3 font-semibold text-end">{t.dash.revenue}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.latestSales.map((sale: any) => (
                    <tr key={sale.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={sale.student?.avatarUrl || ''} />
                            <AvatarFallback className="bg-gradient-cyan text-[10px] font-bold text-white">{sale.student?.fullName?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{sale.student?.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{sale.items?.[0]?.course?.title}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(sale.createdAt, 'relative')}</td>
                      <td className="px-4 py-3 text-end font-display font-bold text-success-700 dark:text-success-400">{formatPrice(sale.items?.[0]?.price || sale.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

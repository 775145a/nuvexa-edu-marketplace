'use client';

import * as React from 'react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { adminApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Primitives';
import { Wallet, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function AdminPaymentsPage() {
  const { t } = useI18n();
  const [payments, setPayments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.pendingPayments();
      setPayments(r.data || []);
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const act = async (p: any, action: 'confirm' | 'reject') => {
    if (action === 'reject' && !confirm('Reject this payment? The order will be cancelled.')) return;
    setBusy(p.id);
    setMessage('');
    try {
      await adminApi.confirmPayment(p.id, action);
      setPayments((prev) => prev.filter((x) => x.id !== p.id));
      setMessage(action === 'confirm' ? 'Payment confirmed. Course activated.' : 'Payment rejected. Order cancelled.');
    } catch {
      setMessage('Action failed. Try again.');
    }
    setBusy(null);
  };

  return (
    <DashboardShell role="ADMIN" title="Manual Payments" subtitle="Verify references against your Vodafone Cash balance, then confirm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {payments.length > 0
            ? `${payments.length} payment${payments.length > 1 ? 's' : ''} awaiting your confirmation`
            : 'No manual payments waiting for confirmation'}
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {message && <div className="mb-4 rounded-xl border border-border bg-card p-3 text-sm">{message}</div>}

      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-20 text-center">
          <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">All caught up. New manual transfers will appear here instantly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p: any) => (
            <Card key={p.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold">{p.order?.orderNumber}</span>
                    <Badge variant="warning">Awaiting confirmation</Badge>
                    <span className="font-bold text-primary">{p.amount?.toLocaleString()} {p.currency || 'EGP'}</span>
                  </div>
                  <p className="text-sm font-medium">
                    {(p.order?.items || []).map((i: any) => i.course?.titleAr || i.course?.title || 'Course').join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Student: <span className="font-medium text-foreground">{p.order?.student?.fullName || '—'}</span> · {p.order?.student?.email || ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sender wallet: <span className="font-mono font-bold text-foreground" dir="ltr">{p.phoneNumber || '—'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reference: <span className="font-mono font-bold text-foreground" dir="ltr">{p.transactionId || p.providerRef || '—'}</span>
                    {' · '}
                    {new Date(p.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="gradient" size="sm" disabled={busy === p.id} onClick={() => act(p, 'confirm')}>
                    <CheckCircle2 className="h-4 w-4" /> Confirm
                  </Button>
                  <Button variant="outline" size="sm" className="text-crimson hover:bg-crimson/10" disabled={busy === p.id} onClick={() => act(p, 'reject')}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

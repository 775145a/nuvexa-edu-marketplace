'use client';

import * as React from 'react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { adminApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input, Field } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Primitives';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = React.useState<any[]>([]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    adminApi.settings().then((r) => {
      setSettings(r.data || []);
      const map: Record<string, string> = {};
      (r.data || []).forEach((s: any) => (map[s.key] = s.value));
      setValues(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const update = async (key: string, value: string) => {
    try {
      await adminApi.updateSetting(key, value);
      setSettings((prev) => prev.some((s) => s.key === key) ? prev.map((s) => (s.key === key ? { ...s, value } : s)) : [...prev, { key, value }]);
    } catch {}
  };

  const saveAll = async () => {
    await Promise.all(Object.entries(values).map(([key, value]) => update(key, value)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const settingMeta: Record<string, { label: string; hint: string }> = {
    DEFAULT_COMMISSION_RATE: { label: 'Commission Rate (%)', hint: 'Percentage taken by the platform per sale' },
    PLATFORM_NAME: { label: 'Platform Name', hint: 'Display name used across the site' },
    SUPPORT_EMAIL: { label: 'Support Email', hint: 'Email shown in support links' },
    MAINTENANCE_MODE: { label: 'Maintenance Mode', hint: 'Set to true to temporarily disable the storefront' },
    CURRENCY: { label: 'Currency', hint: 'Default currency code' },
  };

  return (
    <DashboardShell role="ADMIN" title={t.dash.settings} subtitle="Platform configuration">
      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="h-fit p-5 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold">{t.dash.settings}</h3>
                <p className="text-xs text-muted-foreground">Saved automatically on blur</p>
              </div>
              {saved && (
                <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> {t.common.saved}</Badge>
              )}
            </div>
            <div className="space-y-4">
              {Object.keys(settingMeta).length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t.admin.noSettings}</p>
              ) : (
                Object.entries(settingMeta).map(([key, meta]) => (
                  <Field key={key} label={meta.label} hint={meta.hint}>
                    <Input
                      defaultValue={values[key] || ''}
                      onBlur={(e) => {
                        update(key, e.target.value);
                        setValues((v) => ({ ...v, [key]: e.target.value }));
                      }}
                    />
                  </Field>
                ))
              )}
            </div>
            <Button variant="gradient" className="mt-6" onClick={saveAll}>
              <Save className="h-4 w-4" /> {t.common.save}
            </Button>
          </Card>

          <Card className="h-fit p-5">
            <div className="mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4 text-secondary" />
              <h3 className="font-display text-sm font-bold">All Settings</h3>
            </div>
            <div className="space-y-2">
              {settings.map((s: any) => (
                <div key={s.key} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-xs font-semibold">{s.key}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{s.value}</p>
                </div>
              ))}
              {settings.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">{t.admin.noSettings}</p>}
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}

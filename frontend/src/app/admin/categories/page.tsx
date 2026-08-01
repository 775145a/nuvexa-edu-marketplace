'use client';

import * as React from 'react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { adminApi } from '@/lib/api';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Primitives';
import { FolderTree, Plus, Trash2, BookOpen } from 'lucide-react';

export default function AdminCategoriesPage() {
  const { t } = useI18n();
  const [categories, setCategories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState('');
  const [nameAr, setNameAr] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    adminApi.categories().then((r) => setCategories(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const res = await adminApi.createCategory({ name: name.trim(), nameAr: nameAr.trim(), slug });
      setCategories((prev) => [...prev, res.data]);
      setName('');
      setNameAr('');
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await adminApi.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  };

  return (
    <DashboardShell role="ADMIN" title={t.dash.categories} subtitle={`${categories.length} ${t.dash.categories}`}>
      {loading ? (
        <PageLoader label={t.common.loading} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="h-fit p-5 lg:col-span-1">
            <h3 className="mb-4 font-display text-sm font-bold">{t.common.add}</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (English)" required />
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="Name (العربية)" />
              <Button type="submit" variant="gradient" className="w-full" disabled={saving || !name.trim()}>
                <Plus className="h-4 w-4" /> {saving ? t.common.saving : t.common.add}
              </Button>
            </form>
          </Card>

          <div className="lg:col-span-2">
            {categories.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">{t.admin.noCategories}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {categories.map((cat: any) => (
                  <Card key={cat.id} className="group flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 text-lg">
                      {cat.icon || <FolderTree className="h-5 w-5 text-secondary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{cat.name}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {cat.nameAr && <span>{cat.nameAr} ·</span>}
                        <BookOpen className="h-3 w-3" /> {cat._count?.courses || 0}
                      </p>
                    </div>
                    <Badge variant={cat.isActive === false ? 'destructive' : 'success'}>
                      {cat.isActive === false ? t.dash.drafts : t.dash.approved}
                    </Badge>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="rounded-lg p-2 text-muted-foreground opacity-0 transition-all hover:bg-crimson/10 hover:text-crimson group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

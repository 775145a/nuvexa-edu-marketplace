'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { DashboardShell } from '@/components/layouts/DashboardShell';
import { EmptyState } from '@/components/ui/DataDisplay';
import { Button } from '@/components/ui/Button';
import { Heart, BookOpen } from 'lucide-react';

export default function WishlistPage() {
  const { t } = useI18n();
  return (
    <DashboardShell role="STUDENT" title={t.student.wishlist}>
      <EmptyState
        icon={<Heart className="h-8 w-8" />}
        title={t.student.wishlistEmpty}
        action={<Link href="/courses"><Button variant="gradient"><BookOpen className="h-4 w-4" /> {t.courses.browse}</Button></Link>}
      />
    </DashboardShell>
  );
}

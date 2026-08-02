'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, X } from 'lucide-react';
import { notificationApi } from '@/lib/api';
import { onNotification } from '@/lib/realtime';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { cn } from '@/lib/utils';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

function timeAgo(date: string, locale: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === 'ar' ? 'الآن' : 'now';
  if (mins < 60) return locale === 'ar' ? `منذ ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === 'ar' ? `منذ ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
}

export function NotificationBell({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setLoading(true);
    notificationApi
      .list()
      .then((r) => {
        const data: Notification[] = r.data || [];
        setItems(data);
        setUnread(data.filter((n) => !n.isRead).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const off = onNotification((data: any) => {
      const notif: Notification = {
        id: data.id,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        isRead: false,
        createdAt: data.createdAt || new Date().toISOString(),
      };
      setItems((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      setUnread((u) => u + 1);
    });
    return off;
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAllRead = () => {
    notificationApi.markAllRead().then(() => {
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    });
  };

  const handleLinkClick = (n: Notification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
        aria-label={t.nav.notifications}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white ring-2 ring-background">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute start-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:start-auto sm:end-0">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <p className="text-sm font-bold">{t.nav.notifications}</p>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t.nav.markAllRead}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t.nav.noNotifications}</p>
            )}
            {items.map((n) => {
              const content = (
                <>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt, locale)}</span>
                  </span>
                  {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                </>
              );
              return (
                <div key={n.id}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => handleLinkClick(n)}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-primary/5',
                        !n.isRead && 'bg-primary/[0.04]',
                      )}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={cn('flex items-start gap-3 px-4 py-3', !n.isRead && 'bg-primary/[0.04]')}>{content}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

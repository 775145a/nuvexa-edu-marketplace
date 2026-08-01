'use client';

import { useI18n } from '@/lib/i18n/I18nProvider';
import { WHATSAPP_LINK } from '@/lib/api';

export function WhatsAppButton() {
  const { t } = useI18n();
  return (
    <a
      href={WHATSAPP_LINK(t.home.whatsappGreeting)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.home.viaWhatsapp}
      className="group fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-full p-3.5 text-white shadow-2xl transition-all hover:-translate-y-1"
      style={{
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
        boxShadow: '0 12px 32px -8px rgba(37, 211, 102, 0.55)',
      }}
    >
      <span className="absolute inset-0 -z-10 rounded-full animate-ping bg-green-500/40" />
      <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.7 6L4 29l8.2-1.6c1.2.6 2.5.9 3.8.9 6.6 0 12-5.4 12-12S22.6 3 16 3zm6.1 16.9c-.3.8-1.5 1.5-2.4 1.7-.6.1-1.4.2-4-.9-3.3-1.4-5.4-4.9-5.6-5.1-.2-.2-1.3-1.8-1.3-3.4s.8-2.4 1.1-2.7c.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5s.9 2.2 1 2.3c0 .2.1.3 0 .5-.1.2-.1.3-.2.5l-.4.5c-.2.2-.4.4-.2.7.2.3 1 1.7 2.2 2.7 1.5 1.3 2.8 1.7 3.2 1.9.4.2.6.2.8-.1s1-1.1 1.3-1.5c.3-.4.5-.3.9-.2s2.3 1.1 2.7 1.3c.4.2.6.3.7.5.1.1.1.7-.1 1.1z" />
      </svg>
      <span className="hidden text-sm font-semibold sm:inline">{t.home.whatsapp}</span>
    </a>
  );
}

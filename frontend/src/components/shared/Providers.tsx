'use client';

import { ReactNode, useEffect } from 'react';
import { I18nProvider } from '@/lib/i18n/I18nProvider';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem('nuvexa_locale');
    if (stored === 'ar' || stored === 'en') {
      document.documentElement.dir = stored === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = stored;
    } else {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    }

    const storedTheme = localStorage.getItem('nuvexa_theme');
    const isDark = storedTheme ? storedTheme === 'dark' : true;
    document.documentElement.classList.toggle('dark', isDark);
    window.dispatchEvent(new CustomEvent('nuvexa-theme', { detail: isDark }));
  }, []);

  return <I18nProvider>{children}</I18nProvider>;
}

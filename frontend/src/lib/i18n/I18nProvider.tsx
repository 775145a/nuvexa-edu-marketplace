'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import ar from './locales/ar';
import en from './locales/en';
import { Locale, TranslationMap } from './types';

type I18nContextType = {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: TranslationMap;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const STORAGE_KEY = 'nuvexa_locale';
const translations: Record<Locale, TranslationMap> = { ar, en };

const I18nContext = createContext<I18nContextType>({
  locale: 'ar',
  dir: 'rtl',
  t: ar,
  setLocale: () => {},
  toggleLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === 'ar' || stored === 'en') {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  }, [locale, setLocale]);

  const value: I18nContextType = {
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: translations[locale],
    setLocale,
    toggleLocale,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

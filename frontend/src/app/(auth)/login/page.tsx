'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError(t.auth.emailRequired); return; }
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      localStorage.setItem('pendingVerification', JSON.stringify({ userId: res.data.userId, email, type: 'login' }));
      router.push(`/verify-otp?userId=${res.data.userId}&type=login`);
    } catch (err: any) {
      const msg = err.message || '';
      const map: Record<string, string> = {
        INVALID_CREDENTIALS: t.auth.invalidCredentials,
        ACCOUNT_DISABLED: t.auth.accountDisabled,
      };
      setError(map[msg] || msg || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-display font-bold text-2xl text-white mb-2">
            <span className="gradient-primary text-white px-2 py-1 rounded-lg">N</span>
            Nuvexa
          </Link>
          <h1 className="text-2xl font-bold text-white">{t.auth.login}</h1>
        </div>

        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 dark:text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t.auth.email}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t.auth.password}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {t.common.loading}
                </span>
              ) : t.auth.login}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t.auth.noAccount}{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">{t.auth.createAccount}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

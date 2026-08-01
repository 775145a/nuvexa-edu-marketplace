'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { authApi } from '@/lib/api';

function VerifyOtpForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || '';
  const type = searchParams.get('type') || 'register';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!userId) router.push('/register');
    inputRefs.current[0]?.focus();
  }, [userId, router]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError(t.auth.otpRequired); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp({ userId, otp: code, type });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('sessionToken', res.data.sessionToken);
      localStorage.removeItem('pendingVerification');
      const role = res.data.role;
      if (role === 'ADMIN') router.push('/admin/dashboard');
      else if (role === 'INSTRUCTOR') router.push('/instructor/dashboard');
      else router.push('/student/dashboard');
    } catch (err: any) {
      const msg = err.message || '';
      const map: Record<string, string> = {
        INVALID_OTP: t.auth.invalidOtp,
        EMAIL_NOT_VERIFIED: t.auth.emailNotVerified,
        ACCOUNT_DISABLED: t.auth.accountDisabled,
      };
      setError(map[msg] || msg || t.auth.invalidOtp);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const pending = JSON.parse(localStorage.getItem('pendingVerification') || '{}');
      const email = pending.email || '';
      await authApi.resendOtp({ email, type });
    } catch { }
    setResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">{t.auth.verifyEmail}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t.auth.otpSent}</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 dark:text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex justify-center gap-2 mb-6" dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mb-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {t.common.loading}
                </span>
              ) : t.auth.verify}
            </button>
          </form>

          <div className="text-sm text-muted-foreground">
            <p>{t.auth.didNotReceive}{' '}
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-primary hover:underline font-medium disabled:opacity-50"
              >
                {resending ? t.common.loading : t.auth.resendOtp}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}

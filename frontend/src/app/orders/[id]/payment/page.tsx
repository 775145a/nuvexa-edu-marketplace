'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { orderApi } from '@/lib/api';

const isEgyptianMobile = (v: string) => /^01[0125][0-9]{8}$/.test(v.replace(/[\s-]/g, ''));

export default function PaymentPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const ar = locale === 'ar';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [intent, setIntent] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const [manualRef, setManualRef] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);
  const pollTimer = useRef<any>(null);

  useEffect(() => {
    if (!orderId) return;
    orderApi.myOrders().then(r => {
      const found = (r.data || []).find((o: any) => o.id === orderId);
      if (found) {
        setOrder(found);
        if (found.payments?.[0]?.status === 'AWAITING_CONFIRMATION') setWaitingConfirmation(true);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [orderId]);

  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

  const stopPolling = () => { if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; } };

  const startPolling = () => {
    stopPolling();
    let tries = 0;
    pollTimer.current = setInterval(async () => {
      tries += 1;
      try {
        const r = await orderApi.paymentStatus(orderId);
        if (r.data?.status === 'COMPLETED') {
          stopPolling();
          router.push(`/orders/${orderId}/success`);
        } else if (tries > 40) {
          stopPolling();
          setError(ar ? 'انتهت مهلة انتظار التأكيد. تحقق من حالة الدفع أو أعد المحاولة.' : 'Waiting timed out. Check payment status and try again.');
        }
      } catch {
        if (tries > 40) { stopPolling(); }
      }
    }, 3000);
  };

  const handleStart = async () => {
    const normalized = phone.replace(/[\s-]/g, '');
    if (normalized && !isEgyptianMobile(normalized)) {
      setPhoneError(ar ? 'أدخل رقم محفظة فودافون كاش صحيح (01xxxxxxxxx)' : 'Enter a valid Vodafone Cash number (01xxxxxxxxx)');
      return;
    }
    setPhoneError('');
    setStarting(true);
    setError('');
    try {
      const r = await orderApi.initiate({ orderId, phoneNumber: normalized || undefined });
      setIntent(r.data);
      if (r.data?.mode === 'auto' && normalized) startPolling();
    } catch (err: any) {
      const msg = err.message || (ar ? 'تعذر بدء الدفع' : 'Could not start payment');
      if (/رقم محفظة|phone|wallet number/i.test(msg)) {
        setPhoneError(msg);
      } else {
        setError(msg);
      }
    }
    setStarting(false);
  };

  const handleManualVerify = async () => {
    const normalizedPhone = phone.replace(/[\s-]/g, '');
    if (!manualRef.trim()) {
      setError(ar ? 'أدخل رقم عملية التحويل للتأكيد' : 'Enter the transaction reference to confirm');
      return;
    }
    if (!isEgyptianMobile(normalizedPhone)) {
      setError(ar ? 'أدخل رقم محفظة فودافون كاش الصحيح الذي حوّلت منه (01xxxxxxxxx)' : 'Enter the valid Vodafone Cash number you transferred from (01xxxxxxxxx)');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const r = await orderApi.verifyPayment({ orderId, transactionId: manualRef.trim(), phoneNumber: normalizedPhone });
      if (r.data?.status === 'AWAITING_CONFIRMATION') {
        stopPolling();
        setWaitingConfirmation(true);
      } else {
        stopPolling();
        router.push(`/orders/${orderId}/success`);
      }
    } catch (err: any) {
      setError(err.message || (ar ? 'تعذر التحقق من العملية' : 'Could not verify transaction'));
    }
    setVerifying(false);
  };

  if (loading) return <div className="p-8 max-w-lg mx-auto"><div className="skeleton h-8 w-48 mb-6" /><div className="skeleton h-64 rounded-xl" /></div>;

  if (!order) return (
    <div className="p-8 max-w-lg mx-auto text-center py-20">
      <div className="text-5xl mb-4">🔍</div>
      <h2 className="text-xl font-bold mb-2">{ar ? 'الطلب غير موجود' : 'Order not found'}</h2>
      <Link href="/courses" className="text-primary hover:underline text-sm">{t.courses.browse}</Link>
    </div>
  );

  if (order.status === 'COMPLETED') {
    router.push(`/orders/${orderId}/success`);
    return null;
  }

  if (waitingConfirmation) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto p-8">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 text-3xl mb-3">⏳</div>
            <h2 className="text-lg font-bold mb-2">{ar ? 'بانتظار تأكيد البائع' : 'Awaiting Seller Confirmation'}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {ar ? 'تم استلام رقم العملية. سيتم التحقق من وصول المبلغ وتفعيل الكورس خلال وقت قصير، وستصلك رسالة عند التأكيد.' : 'We received your transaction reference. Once the transfer is confirmed the course will be activated and you will be notified.'}
            </p>
            <Link href="/orders" className="inline-block py-3 px-6 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity">
              {ar ? 'طلباتي' : 'My Orders'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isFree = order.total <= 0;
  const manualMode = intent && intent.mode === 'manual';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-8">
        <Link href="/courses" className="text-sm text-primary hover:underline mb-6 inline-block">&larr; {ar ? 'العودة للكورسات' : 'Back to courses'}</Link>

        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <h1 className="text-xl font-display font-bold mb-4">{ar ? 'إتمام الدفع' : 'Complete Payment'}</h1>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{ar ? 'رقم الطلب' : 'Order'}</span>
              <span className="font-medium">{order.orderNumber}</span>
            </div>
            {(order.items || []).map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.course?.title}</span>
                <span className="font-medium">{item.price?.toLocaleString()} {order.currency || 'EGP'}</span>
              </div>
            ))}
            <div className="border-t border-border pt-3 flex justify-between text-sm">
              <span className="text-muted-foreground">{ar ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span>{(order.subtotal ?? order.total)?.toLocaleString()} {order.currency || 'EGP'}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{ar ? 'الخصم' : 'Discount'}</span>
                <span>-{order.discount?.toLocaleString()} {order.currency || 'EGP'}</span>
              </div>
            )}
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{ar ? 'الضريبة (ض.ق.م 14%)' : 'VAT (14%)'}</span>
                <span>+{order.taxAmount?.toLocaleString()} {order.currency || 'EGP'}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-bold">{ar ? 'الإجمالي شامل الضريبة' : 'Total incl. VAT'}</span>
              <span className="font-bold text-lg text-primary">{order.total?.toLocaleString()} {order.currency || 'EGP'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 px-3 py-1 font-semibold">📱 {ar ? 'فودافون كاش' : 'Vodafone Cash'}</span>
          </div>
        </div>

        {isFree ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-lg font-bold mb-2">{ar ? 'كورس مجاني!' : 'Free Course!'}</h2>
            <p className="text-sm text-muted-foreground mb-4">{ar ? 'هذا الكورس مجاني. اضغط للتسجيل فورًا.' : 'This course is free. Click below to enroll immediately.'}</p>
            <button onClick={() => orderApi.verifyPayment({ orderId, transactionId: 'free_' + Date.now() }).then(() => router.push(`/orders/${orderId}/success`)).catch((e: any) => setError(e.message || t.common.error))}
              className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {t.common.loading ? t.common.loading : (ar ? 'سجّل الآن' : 'Enroll Now')}
            </button>
          </div>
        ) : !intent ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold mb-4">📱 {ar ? 'ادفع عبر فودافون كاش' : 'Pay via Vodafone Cash'}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {ar ? 'اضغط «ابدأ الدفع» وستظهر لك تعليمات الإتمام: تحويل مباشر إلى محفظة المتجر أو رمز تأكيد يُرسل لهاتفك — لا يُخصم أي مبلغ قبل تأكيدك.' : 'Tap Start Payment and follow the instructions: a direct transfer to the store wallet or a confirmation code sent to your phone — nothing is charged before you confirm.'}
            </p>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

            <label className="text-xs text-muted-foreground mb-1 block">{ar ? 'رقم محفظتك (اختياري — يُطلب فقط للدفع برمز التأكيد)' : 'Your wallet number (optional — only needed for the code flow)'}</label>
            <input type="tel" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx"
              className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-2 text-sm" />
            {phoneError && <p className="text-red-500 text-xs mb-4">{phoneError}</p>}

            <button onClick={handleStart} disabled={starting}
              className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {starting ? t.common.loading : (ar ? 'ابدأ الدفع' : 'Start Payment')}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6">
            {manualMode ? (
              <>
                <h2 className="text-lg font-bold mb-4">{ar ? 'حوالة إلى محفظة المتجر' : 'Transfer to Store Wallet'}</h2>
                <div className="bg-muted/30 rounded-xl p-4 mb-4 text-sm">
                  <p className="font-medium mb-2">{ar ? 'التعليمات:' : 'Instructions:'}</p>
                  <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                    <li>{ar ? 'افتح تطبيق فودافون كاش' : 'Open your Vodafone Cash app'}</li>
                    <li>
                      {ar ? 'حوّل' : 'Transfer'} <strong>{order.total?.toLocaleString()} {order.currency || 'EGP'}</strong> {ar ? 'إلى محفظة' : 'to the'}
                      {intent.walletNumber ? (
                        <span className="block mt-1 font-mono font-bold text-foreground text-base" dir="ltr">{intent.walletNumber}</span>
                      ) : (
                        <strong> {intent.storeName || (ar ? 'المنصة' : 'platform')}</strong>
                      )}
                    </li>
                    <li>{ar ? 'أدخل رقم محفظتك التي حوّلت منها ورقم العملية للتأكيد' : 'Enter the wallet number you transferred from and the transaction reference'}</li>
                  </ol>
                </div>
                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}
                <label className="text-xs text-muted-foreground mb-1 block">{ar ? 'رقم محفظتك (التي حوّلت منها)' : 'Your wallet number (that you transferred from)'}</label>
                <input type="tel" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-3 text-sm" />
                <label className="text-xs text-muted-foreground mb-1 block">{ar ? 'رقم العملية' : 'Transaction reference'}</label>
                <input type="text" dir="ltr" value={manualRef} onChange={e => setManualRef(e.target.value)}
                  placeholder={ar ? 'رقم عملية التحويل' : 'Transaction reference'}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-4 text-sm" />
                <button onClick={handleManualVerify} disabled={verifying || !manualRef.trim()}
                  className="w-full py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {verifying ? t.common.loading : (ar ? 'تأكيد الدفع' : 'Verify Payment')}
                </button>
              </>
            ) : (
              <>
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-3xl mb-3">📱</div>
                  <h2 className="text-lg font-bold mb-1">{ar ? 'أكّد الدفع برمز التأكيد' : 'Confirm Payment with the Code'}</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {ar ? 'تم إرسال رمز تأكيد إلى هاتفك عبر فودافون كاش (رسالة SMS أو إشعار في التطبيق). أدخل الرمز في تطبيق فودافون كاش لإتمام العملية. لن يُخصم المبلغ إلا بعد التأكيد.' : 'A confirmation code was sent to your phone via Vodafone Cash (SMS or in-app notification). Enter the code in the Vodafone Cash app to complete the payment. You will only be charged after you confirm.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {ar ? 'جارٍ متابعة حالة الدفع...' : 'Tracking payment status...'}
                  </div>
                </div>
                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {ar ? 'لديك رقم عملية؟ تحقق يدويًا' : 'Have a transaction number? Verify manually'}
                  </summary>
                  <div className="mt-3 flex gap-2">
                    <input type="text" dir="ltr" value={manualRef} onChange={e => setManualRef(e.target.value)}
                      placeholder={ar ? 'رقم العملية' : 'Transaction number'}
                      className="flex-1 px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    <button onClick={handleManualVerify} disabled={verifying || !manualRef.trim()}
                      className="px-4 py-2 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                      {verifying ? t.common.loading : (ar ? 'تحقق' : 'Verify')}
                    </button>
                  </div>
                </details>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

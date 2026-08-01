import { config } from '../config';
import { enqueueMail } from './queue';
import { sendMailDirect } from './mailTransport';

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (config.queue.provider === 'redis') {
    await enqueueMail({ to, subject, html });
    return;
  }
  await sendMailDirect(to, subject, html);
}

export function sendOtpEmail(to: string, otp: string, purpose: string): Promise<void> {
  const subject = purpose === 'register'
    ? `Your ${config.platform.name} Verification Code`
    : `Your ${config.platform.name} Login Code`;

  const html = `
    <!DOCTYPE html>
    <html dir="ltr">
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="480" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); padding: 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">${config.platform.name}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Hello,</p>
                  <p style="color: #666; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
                    ${purpose === 'register'
                      ? 'Thank you for creating an account. Use the code below to verify your email address.'
                      : 'Use the code below to complete your login.'}
                  </p>
                  <div style="background: #f4f7fa; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e3a5f; font-family: 'Courier New', monospace;">${otp}</div>
                  </div>
                  <p style="color: #999; font-size: 12px; margin: 0; line-height: 1.5;">
                    This code expires in ${config.otp.expiryMinutes} minutes. Never share this code with anyone.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background: #f8f9fa; padding: 20px 32px; text-align: center;">
                  <p style="color: #999; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${config.platform.name}. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      ...(process.env.SMTP_REJECT_UNAUTHORIZED === 'false'
        ? { tls: { rejectUnauthorized: false } }
        : {}),
    });
  }
  return transporter;
}

function isConfigured(): boolean {
  return !!config.smtp.user && !config.smtp.user.includes('your-email') && !!config.smtp.pass;
}

export async function sendMailDirect(to: string, subject: string, html: string): Promise<void> {
  if (!isConfigured()) {
    if (config.env === 'development') {
      logger.info(`[DEV] Email skipped (SMTP not configured). Would send to ${to}: ${subject}`);
      return;
    }
    throw new Error('SMTP not configured');
  }
  const t = getTransporter();
  await t.sendMail({
    from: `"${config.smtp.fromName}" <${config.smtp.from}>`,
    to,
    subject,
    html,
  });
}

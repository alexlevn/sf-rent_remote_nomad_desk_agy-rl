import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  from: string;
  user?: string;
  pass?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface SendEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

const DEFAULT_SMTP_HOST = 'localhost';
const DEFAULT_SMTP_PORT = 11188;
const DEFAULT_SMTP_FROM = 'NomadDesk <noreply@nomaddesk.com>';

interface GlobalEmailCache {
  __nomadDeskEmailTransporter?: {
    key: string;
    transporter: Transporter;
  };
}

const globalForEmail = globalThis as unknown as GlobalEmailCache;

function parseSmtpPort(rawPort: string | undefined): number {
  if (!rawPort) return DEFAULT_SMTP_PORT;
  const parsed = Number.parseInt(rawPort.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_SMTP_PORT;
  }
  return parsed;
}

export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim() || DEFAULT_SMTP_HOST;
  const port = parseSmtpPort(process.env.SMTP_PORT);
  const from = process.env.SMTP_FROM?.trim() || DEFAULT_SMTP_FROM;
  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS?.trim() || undefined;

  return { host, port, from, user, pass };
}

// Strip CR/LF to prevent SMTP header injection.
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function getEmailTransporter(): Transporter {
  const config = getSmtpConfig();
  const cacheKey = `${config.host}:${config.port}:${config.user ?? ''}`;

  if (globalForEmail.__nomadDeskEmailTransporter?.key === cacheKey) {
    return globalForEmail.__nomadDeskEmailTransporter.transporter;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false,
    ...(config.user && config.pass
      ? { auth: { user: config.user, pass: config.pass } }
      : {}),
  });

  // Cache on globalThis so Next.js dev reloads and route handlers share one transport pool.
  globalForEmail.__nomadDeskEmailTransporter = {
    key: cacheKey,
    transporter,
  };

  return transporter;
}

export function resetEmailTransporter(): void {
  globalForEmail.__nomadDeskEmailTransporter = undefined;
}

export async function sendEmail(
  input: SendEmailInput,
  transporterOverride?: Transporter,
): Promise<SendEmailResult> {
  const config = getSmtpConfig();
  const transporter = transporterOverride ?? getEmailTransporter();

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map(sanitizeHeaderValue)
    .filter((addr) => addr.length > 0);

  if (recipients.length === 0) {
    throw new Error('At least one recipient email address is required.');
  }

  const info = await transporter.sendMail({
    from: sanitizeHeaderValue(config.from),
    to: recipients.join(', '),
    subject: sanitizeHeaderValue(input.subject),
    html: input.html,
    text: input.text,
    ...(input.replyTo ? { replyTo: sanitizeHeaderValue(input.replyTo) } : {}),
  });

  return {
    messageId: typeof info.messageId === 'string' ? info.messageId : '',
    accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
    rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
  };
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  getSmtpConfig,
  resetEmailTransporter,
  sanitizeHeaderValue,
  sendEmail,
} from '@/lib/email/client';
import {
  bookingCancelledTemplate,
  bookingConfirmedTemplate,
  bookingDecisionTemplate,
  bookingRequestSentTemplate,
  contactFormTemplate,
  hostApplicationNotificationTemplate,
  listingModerationTemplate,
  newBookingRequestTemplate,
  passwordResetTemplate,
} from '@/lib/email/templates';
import {
  notifyBookingCancelled,
  notifyBookingConfirmed,
  notifyBookingDecision,
  notifyNewBookingRequest,
  notifyPasswordReset,
} from '@/lib/email/notifications';

const sampleReservation = {
  code: 'ND-TEST1',
  guestName: 'Alex Nomad',
  guestEmail: 'demo@example.com',
  moveInDate: '2026-12-01',
  moveOutDate: '2027-01-01',
  nights: 31,
  totalAmount: 265000,
  respondBy: '2026-11-23T21:00:00Z',
};

const sampleProperty = {
  title: 'Retiro Sunlit Loft',
  city: 'Madrid',
  country: 'Spain',
  neighborhood: 'Jerónimos',
  address: 'Calle de Alfonso XII, 32',
  reference: 'ND-MAD-01',
};

const sampleHost = {
  displayName: 'Madrid Urban Stays',
  cities: 'Madrid, Barcelona',
  rejectionReason: null,
};

interface MailpitMessageSummary {
  ID: string;
  Subject: string;
  To: Array<{ Address: string; Name: string }>;
}

interface MailpitMessagesResponse {
  total: number;
  messages: MailpitMessageSummary[];
}

async function isMailpitRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:18188/api/v1/messages', {
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

describe('Email SMTP client & config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEmailTransporter();
  });

  it('defaults to localhost:11188 and NomadDesk sender', () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_FROM;

    const cfg = getSmtpConfig();
    expect(cfg.host).toBe('localhost');
    expect(cfg.port).toBe(11188);
    expect(cfg.from).toContain('NomadDesk');
  });

  it('falls back to 11188 when SMTP_PORT is invalid', () => {
    process.env.SMTP_PORT = 'not-a-port';
    expect(getSmtpConfig().port).toBe(11188);
  });

  it('strips CR/LF characters to prevent header injection', () => {
    expect(sanitizeHeaderValue('Hello\r\nBcc: evil@example.com')).toBe(
      'Hello Bcc: evil@example.com',
    );
  });

  it('sends email through a custom jsonTransport without errors', async () => {
    const jsonTransport = nodemailer.createTransport({ jsonTransport: true });
    const result = await sendEmail(
      {
        to: 'demo@example.com',
        subject: 'Unit test email',
        html: '<p>Hello</p>',
        text: 'Hello',
      },
      jsonTransport,
    );

    expect(result.messageId).toBeTruthy();
  });

  it('throws when recipient list is empty', async () => {
    const jsonTransport = nodemailer.createTransport({ jsonTransport: true });
    await expect(
      sendEmail(
        {
          to: '   ',
          subject: 'No recipient',
          html: '<p>Hi</p>',
          text: 'Hi',
        },
        jsonTransport,
      ),
    ).rejects.toThrow(/recipient/i);
  });
});

describe('Email templates', () => {
  it('renders booking confirmed, new request, and request sent templates with expected subjects', () => {
    const confirmed = bookingConfirmedTemplate(sampleReservation, sampleProperty);
    expect(confirmed.subject).toContain('Booking confirmed');
    expect(confirmed.html).toContain('ND-TEST1');
    expect(confirmed.html).toContain('$2,650.00');
    expect(confirmed.text).toContain('Retiro Sunlit Loft');

    const newReq = newBookingRequestTemplate(sampleReservation, sampleProperty, sampleHost);
    expect(newReq.subject).toContain('New booking request');
    expect(newReq.html).toContain('Madrid Urban Stays');

    const reqSent = bookingRequestSentTemplate(sampleReservation, sampleProperty);
    expect(reqSent.subject).toContain('Request sent');
    expect(reqSent.html).toContain('48 hours');
  });

  it('renders decision, cancellation, host application, listing moderation, reset, and contact templates', () => {
    const rejected = bookingDecisionTemplate(
      sampleReservation,
      sampleProperty,
      'rejected',
      'Dates unavailable',
    );
    expect(rejected.subject).toContain('declined');
    expect(rejected.html).toContain('Dates unavailable');

    const cancelled = bookingCancelledTemplate(sampleReservation, sampleProperty, 'admin');
    expect(cancelled.subject).toContain('cancelled');
    expect(cancelled.text).toContain('NomadDesk support');

    const hostApproved = hostApplicationNotificationTemplate(sampleHost, 'approved');
    expect(hostApproved.subject).toContain('approved');

    const listingRejected = listingModerationTemplate(
      sampleProperty,
      'rejected',
      'Add desk photos',
    );
    expect(listingRejected.html).toContain('Add desk photos');

    const reset = passwordResetTemplate(
      'demo@example.com',
      'http://localhost:3288/password/reset?token=abc',
    );
    expect(reset.subject).toContain('Reset');
    expect(reset.html).toContain('http://localhost:3288/password/reset?token=abc');

    const contact = contactFormTemplate({
      name: 'Jane',
      email: 'jane@example.com',
      message: 'Hello!',
    });
    expect(contact.subject).toContain('Jane');
  });

  it('escapes HTML and blocks javascript: URLs in templates', () => {
    const xssRes = { ...sampleReservation, guestName: '<script>alert(1)</script>' };
    const tpl = bookingConfirmedTemplate(xssRes, sampleProperty);
    expect(tpl.html).not.toContain('<script>');
    expect(tpl.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');

    const badReset = passwordResetTemplate('demo@example.com', 'javascript:alert(1)');
    expect(badReset.html).not.toContain('javascript:');
  });
});

describe('Notification dispatcher resilience', () => {
  it('catches SMTP errors without throwing so transactions are never blocked', async () => {
    const failingTransport = {
      sendMail: vi.fn().mockRejectedValue(new Error('SMTP connection refused')),
    } as unknown as Transporter;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ok = await notifyBookingConfirmed(
      sampleReservation,
      sampleProperty,
      'host@example.com',
      { transporter: failingTransport },
    );

    expect(ok).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('dispatches to both guest and host where required', async () => {
    const sendMail = vi.fn().mockResolvedValue({
      messageId: '<test@nomaddesk.local>',
      accepted: ['ok@example.com'],
      rejected: [],
    });
    const mockTransport = { sendMail } as unknown as Transporter;

    await notifyNewBookingRequest(
      sampleReservation,
      sampleProperty,
      sampleHost,
      'host@example.com',
      { transporter: mockTransport },
    );
    expect(sendMail).toHaveBeenCalledTimes(2);

    sendMail.mockClear();
    await notifyBookingDecision(
      sampleReservation,
      sampleProperty,
      'expired',
      null,
      'host@example.com',
      { transporter: mockTransport },
    );
    expect(sendMail).toHaveBeenCalledTimes(2);

    sendMail.mockClear();
    await notifyBookingCancelled(
      sampleReservation,
      sampleProperty,
      'guest',
      'host@example.com',
      { transporter: mockTransport },
    );
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});

describe('Mailpit live SMTP integration', () => {
  it('delivers transactional email to local Mailpit when running', async () => {
    const available = await isMailpitRunning();
    if (!available) {
      return;
    }

    const uniqueCode = `ND-MAILPIT-${Date.now()}`;
    const delivered = await notifyPasswordReset(
      'demo@example.com',
      `http://localhost:3288/password/reset?token=${uniqueCode}`,
    );
    expect(delivered).toBe(true);

    const reqDelivered = await notifyNewBookingRequest(
      { ...sampleReservation, code: uniqueCode },
      sampleProperty,
      sampleHost,
      'host@example.com',
    );
    expect(reqDelivered).toBe(true);

    const res = await fetch('http://localhost:18188/api/v1/messages');
    expect(res.ok).toBe(true);
    const data = (await res.json()) as MailpitMessagesResponse;
    expect(data.total).toBeGreaterThan(0);

    const hostMsg = data.messages.find(
      (m) =>
        m.Subject.includes('New booking request') &&
        m.Subject.includes(uniqueCode) &&
        m.To.some((r) => r.Address === 'host@example.com'),
    );
    expect(hostMsg).toBeDefined();
  });
});

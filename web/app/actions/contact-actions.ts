'use server';

import { z } from 'zod';
import { sendEmail } from '@/lib/email/client';
import { SITE_CONFIG } from '@/content/site';

const contactFormSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(180),
  subject: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(5, 'Please enter a message (at least 5 characters)').max(4000),
});

export interface ContactActionResult {
  success: boolean;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function submitContactInquiryAction(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<ContactActionResult> {
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Please check the required fields.',
    };
  }

  const { name, email, subject, message } = parsed.data;
  const emailSubject = subject
    ? `[${SITE_CONFIG.name} Support] ${subject}`
    : `[${SITE_CONFIG.name} Support] New inquiry from ${name}`;

  const textBody = [
    `Name: ${name}`,
    `Email: ${email}`,
    subject ? `Subject: ${subject}` : null,
    '',
    message,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const htmlBody = `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; color: #1f1b17;">
      <h2 style="margin-bottom: 12px;">New Support Inquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ''}
      <hr style="border: 0; border-top: 1px solid #e5e0d8; margin: 16px 0;" />
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;

  try {
    await sendEmail({
      to: SITE_CONFIG.contactEmail,
      replyTo: email,
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
    });
    return { success: true };
  } catch (err) {
    console.error('[submitContactInquiryAction] Failed to dispatch contact email:', err);
    return {
      success: false,
      error: 'Unable to send your message right now. Please try again in a moment.',
    };
  }
}

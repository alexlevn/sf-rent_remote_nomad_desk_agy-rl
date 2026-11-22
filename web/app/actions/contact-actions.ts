'use server';

import { z } from 'zod';
import { notifyContactForm } from '@/lib/email/notifications';
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
  const sent = await notifyContactForm(
    { name, email, subject: subject || undefined, message },
    SITE_CONFIG.contactEmail
  );

  if (!sent) {
    return {
      success: false,
      error: 'Unable to send your message right now. Please try again in a moment.',
    };
  }

  return { success: true };
}

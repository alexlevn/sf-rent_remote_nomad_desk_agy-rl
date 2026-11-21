import type { Transporter } from 'nodemailer';
import { sendEmail } from '@/lib/email/client';
import type {
  BookingCancelledBy,
  BookingDecisionAction,
  EmailHostInfo,
  EmailPropertyInfo,
  EmailReservationInfo,
  EmailTemplate,
  HostApplicationAction,
  ListingModerationAction,
} from '@/lib/email/templates';
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
import type { HostProfile } from '@/lib/types/host';
import type { Property } from '@/lib/types/property';

const DEFAULT_ADMIN_EMAIL = 'admin@example.com';

export interface NotificationOptions {
  transporter?: Transporter;
}

// Swallow SMTP errors after logging so email delivery never blocks or aborts DB transactions.
async function dispatchTemplate(
  to: string | string[],
  template: EmailTemplate,
  label: string,
  options?: NotificationOptions & { replyTo?: string },
): Promise<boolean> {
  try {
    await sendEmail(
      {
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: options?.replyTo,
      },
      options?.transporter,
    );
    return true;
  } catch (err) {
    console.error(`[email] Failed to send ${label}:`, err);
    return false;
  }
}

export async function notifyBookingConfirmed(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
  hostEmail?: string,
  options?: NotificationOptions,
): Promise<boolean> {
  const template = bookingConfirmedTemplate(reservation, property);
  const deliveries: Promise<boolean>[] = [
    dispatchTemplate(reservation.guestEmail, template, 'booking-confirmed-guest', options),
  ];

  if (hostEmail && hostEmail.trim().length > 0) {
    deliveries.push(
      dispatchTemplate(hostEmail, template, 'booking-confirmed-host', options),
    );
  }

  const results = await Promise.all(deliveries);
  return results.every(Boolean);
}

export async function notifyNewBookingRequest(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
  host: Pick<HostProfile, 'displayName'>,
  hostEmail: string,
  options?: NotificationOptions,
): Promise<boolean> {
  const hostTemplate = newBookingRequestTemplate(reservation, property, host);
  const guestTemplate = bookingRequestSentTemplate(reservation, property);

  const results = await Promise.all([
    dispatchTemplate(hostEmail, hostTemplate, 'new-booking-request-host', options),
    dispatchTemplate(reservation.guestEmail, guestTemplate, 'booking-request-sent-guest', options),
  ]);

  return results.every(Boolean);
}

export async function notifyBookingDecision(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
  action: BookingDecisionAction,
  reason?: string | null,
  hostEmail?: string,
  options?: NotificationOptions,
): Promise<boolean> {
  const template = bookingDecisionTemplate(reservation, property, action, reason);
  const deliveries: Promise<boolean>[] = [
    dispatchTemplate(reservation.guestEmail, template, `booking-${action}-guest`, options),
  ];

  // Expired requests notify both guest and host per Section 5.10.
  if (action === 'expired' && hostEmail && hostEmail.trim().length > 0) {
    deliveries.push(
      dispatchTemplate(hostEmail, template, 'booking-expired-host', options),
    );
  }

  const results = await Promise.all(deliveries);
  return results.every(Boolean);
}

export async function notifyBookingCancelled(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
  cancelledBy: BookingCancelledBy,
  hostEmail?: string,
  options?: NotificationOptions,
): Promise<boolean> {
  const template = bookingCancelledTemplate(reservation, property, cancelledBy);
  const deliveries: Promise<boolean>[] = [
    dispatchTemplate(reservation.guestEmail, template, 'booking-cancelled-guest', options),
  ];

  if (hostEmail && hostEmail.trim().length > 0) {
    deliveries.push(
      dispatchTemplate(hostEmail, template, 'booking-cancelled-host', options),
    );
  }

  const results = await Promise.all(deliveries);
  return results.every(Boolean);
}

export async function notifyHostApplication(
  hostProfile: EmailHostInfo,
  action: HostApplicationAction,
  recipientEmail?: string,
  options?: NotificationOptions,
): Promise<boolean> {
  const target =
    recipientEmail?.trim() ||
    (action === 'submitted'
      ? process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL
      : '');

  if (!target) {
    return false;
  }

  const template = hostApplicationNotificationTemplate(hostProfile, action);
  return dispatchTemplate(target, template, `host-application-${action}`, options);
}

export async function notifyListingModeration(
  property: Pick<Property, 'title' | 'city' | 'reference'>,
  action: ListingModerationAction,
  hostEmail: string,
  reason?: string | null,
  options?: NotificationOptions,
): Promise<boolean> {
  const template = listingModerationTemplate(property, action, reason);
  return dispatchTemplate(hostEmail, template, `listing-${action}-host`, options);
}

export async function notifyPasswordReset(
  email: string,
  resetUrl: string,
  options?: NotificationOptions,
): Promise<boolean> {
  const template = passwordResetTemplate(email, resetUrl);
  return dispatchTemplate(email, template, 'password-reset', options);
}

export async function notifyContactForm(
  input: { name: string; email: string; message: string },
  adminEmail?: string,
  options?: NotificationOptions,
): Promise<boolean> {
  const target =
    adminEmail?.trim() || process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL;
  const template = contactFormTemplate(input);
  return dispatchTemplate(target, template, 'contact-form', {
    ...options,
    replyTo: input.email,
  });
}

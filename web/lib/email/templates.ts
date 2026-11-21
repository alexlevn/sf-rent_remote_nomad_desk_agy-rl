import type { HostProfile } from '@/lib/types/host';
import type { Property } from '@/lib/types/property';
import type { Reservation } from '@/lib/types/reservation';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export type EmailReservationInfo = Pick<
  Reservation,
  | 'code'
  | 'guestName'
  | 'guestEmail'
  | 'moveInDate'
  | 'moveOutDate'
  | 'nights'
  | 'totalAmount'
  | 'respondBy'
>;

export type EmailPropertyInfo = Pick<
  Property,
  'title' | 'city' | 'country' | 'neighborhood' | 'address'
>;

export type EmailHostInfo = Pick<HostProfile, 'displayName' | 'cities' | 'rejectionReason'>;

export type BookingDecisionAction = 'accepted' | 'rejected' | 'expired';
export type BookingCancelledBy = 'guest' | 'host' | 'admin';
export type HostApplicationAction = 'submitted' | 'approved' | 'rejected' | 'suspended';
export type ListingModerationAction = 'approved' | 'rejected';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUsdFromCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

function sanitizeSafeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  return '#';
}

function wrapHtmlLayout(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e7e5e4;overflow:hidden;">
    <div style="background-color:#1c1917;color:#ffffff;padding:20px 24px;">
      <div style="font-size:18px;font-weight:700;letter-spacing:-0.01em;">NomadDesk</div>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1c1917;">${escapeHtml(heading)}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;background-color:#fafaf9;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c;">
      NomadDesk &mdash; Remote-work ready furnished apartments
    </div>
  </div>
</body>
</html>`;
}

function renderReservationSummaryHtml(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
): string {
  const totalFormatted = formatUsdFromCents(reservation.totalAmount);
  const location = [property.neighborhood, property.city, property.country]
    .filter((part) => part && part.trim().length > 0)
    .join(', ');

  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
  <tr><td style="padding:6px 0;color:#57534e;">Reservation Code</td><td style="padding:6px 0;font-weight:600;text-align:right;">${escapeHtml(reservation.code)}</td></tr>
  <tr><td style="padding:6px 0;color:#57534e;">Apartment</td><td style="padding:6px 0;font-weight:600;text-align:right;">${escapeHtml(property.title)}</td></tr>
  <tr><td style="padding:6px 0;color:#57534e;">Location</td><td style="padding:6px 0;text-align:right;">${escapeHtml(location)}</td></tr>
  <tr><td style="padding:6px 0;color:#57534e;">Dates</td><td style="padding:6px 0;text-align:right;">${escapeHtml(reservation.moveInDate)} to ${escapeHtml(reservation.moveOutDate)} (${reservation.nights} nights)</td></tr>
  <tr><td style="padding:6px 0;color:#57534e;">Total</td><td style="padding:6px 0;font-weight:700;text-align:right;">${escapeHtml(totalFormatted)}</td></tr>
</table>`;
}

function renderReservationSummaryText(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
): string {
  const totalFormatted = formatUsdFromCents(reservation.totalAmount);
  return [
    `Reservation Code: ${reservation.code}`,
    `Apartment: ${property.title}`,
    `Location: ${property.city}, ${property.country}`,
    `Dates: ${reservation.moveInDate} to ${reservation.moveOutDate} (${reservation.nights} nights)`,
    `Total: ${totalFormatted}`,
  ].join('\n');
}

export function bookingConfirmedTemplate(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
): EmailTemplate {
  const subject = `Booking confirmed: ${property.title} (${reservation.code})`;
  const html = wrapHtmlLayout(
    'Booking confirmed',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${escapeHtml(reservation.guestName)},</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Your booking for <strong>${escapeHtml(property.title)}</strong> is confirmed. We look forward to hosting your stay.</p>
${renderReservationSummaryHtml(reservation, property)}
<p style="margin:12px 0 0;font-size:13px;color:#57534e;">Address: ${escapeHtml(property.address)}</p>`,
  );
  const text = [
    `Hi ${reservation.guestName},`,
    '',
    `Your booking for ${property.title} is confirmed.`,
    '',
    renderReservationSummaryText(reservation, property),
    `Address: ${property.address}`,
  ].join('\n');

  return { subject, html, text };
}

export function newBookingRequestTemplate(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
  host: Pick<HostProfile, 'displayName'>,
): EmailTemplate {
  const subject = `New booking request: ${property.title} (${reservation.code})`;
  const deadlineLine = reservation.respondBy
    ? `Please accept or reject this request before ${reservation.respondBy}.`
    : 'Please review and respond within 48 hours.';

  const html = wrapHtmlLayout(
    'New booking request',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${escapeHtml(host.displayName)},</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">You have a new booking request from <strong>${escapeHtml(reservation.guestName)}</strong> for <strong>${escapeHtml(property.title)}</strong>.</p>
${renderReservationSummaryHtml(reservation, property)}
<p style="margin:12px 0 0;font-size:14px;line-height:1.6;">${escapeHtml(deadlineLine)}</p>`,
  );
  const text = [
    `Hi ${host.displayName},`,
    '',
    `New booking request from ${reservation.guestName} for ${property.title}.`,
    '',
    renderReservationSummaryText(reservation, property),
    '',
    deadlineLine,
  ].join('\n');

  return { subject, html, text };
}

export function bookingRequestSentTemplate(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
): EmailTemplate {
  const subject = `Request sent: ${property.title} (${reservation.code})`;
  const html = wrapHtmlLayout(
    'Request sent',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${escapeHtml(reservation.guestName)},</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Your booking request for <strong>${escapeHtml(property.title)}</strong> has been sent to the host. The host has 48 hours to respond.</p>
${renderReservationSummaryHtml(reservation, property)}`,
  );
  const text = [
    `Hi ${reservation.guestName},`,
    '',
    `Your booking request for ${property.title} has been sent to the host. The host has 48 hours to respond.`,
    '',
    renderReservationSummaryText(reservation, property),
  ].join('\n');

  return { subject, html, text };
}

export function bookingDecisionTemplate(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
  action: BookingDecisionAction,
  reason?: string | null,
): EmailTemplate {
  const headingByAction: Record<BookingDecisionAction, string> = {
    accepted: 'Booking request accepted',
    rejected: 'Booking request declined',
    expired: 'Booking request expired',
  };

  const subjectByAction: Record<BookingDecisionAction, string> = {
    accepted: `Booking confirmed: ${property.title} (${reservation.code})`,
    rejected: `Booking request declined: ${property.title} (${reservation.code})`,
    expired: `Booking request expired: ${property.title} (${reservation.code})`,
  };

  const messageByAction: Record<BookingDecisionAction, string> = {
    accepted: `Good news! The host accepted your booking request for ${property.title}. Your reservation is now confirmed.`,
    rejected: `Unfortunately, the host declined your booking request for ${property.title}. Any payment authorization has been voided.`,
    expired: `Your booking request for ${property.title} expired because the host did not respond within the 48-hour window. Any payment authorization has been voided.`,
  };

  const trimmedReason = reason?.trim() || '';
  const reasonHtml = trimmedReason
    ? `<p style="margin:12px 0;padding:12px;background-color:#fafaf9;border-left:3px solid #a8a29e;font-size:14px;"><strong>Reason:</strong> ${escapeHtml(trimmedReason)}</p>`
    : '';
  const reasonText = trimmedReason ? `Reason: ${trimmedReason}` : '';

  const html = wrapHtmlLayout(
    headingByAction[action],
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${escapeHtml(reservation.guestName)},</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">${escapeHtml(messageByAction[action])}</p>
${reasonHtml}
${renderReservationSummaryHtml(reservation, property)}`,
  );

  const text = [
    `Hi ${reservation.guestName},`,
    '',
    messageByAction[action],
    ...(reasonText ? ['', reasonText] : []),
    '',
    renderReservationSummaryText(reservation, property),
  ].join('\n');

  return { subject: subjectByAction[action], html, text };
}

export function bookingCancelledTemplate(
  reservation: EmailReservationInfo,
  property: EmailPropertyInfo,
  cancelledBy: BookingCancelledBy,
): EmailTemplate {
  const actorLabel: Record<BookingCancelledBy, string> = {
    guest: 'the guest',
    host: 'the host',
    admin: 'NomadDesk support',
  };

  const subject = `Booking cancelled: ${property.title} (${reservation.code})`;
  const html = wrapHtmlLayout(
    'Booking cancelled',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${escapeHtml(reservation.guestName)},</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Reservation <strong>${escapeHtml(reservation.code)}</strong> for <strong>${escapeHtml(property.title)}</strong> was cancelled by ${escapeHtml(actorLabel[cancelledBy])}.</p>
${renderReservationSummaryHtml(reservation, property)}`,
  );
  const text = [
    `Hi ${reservation.guestName},`,
    '',
    `Reservation ${reservation.code} for ${property.title} was cancelled by ${actorLabel[cancelledBy]}.`,
    '',
    renderReservationSummaryText(reservation, property),
  ].join('\n');

  return { subject, html, text };
}

export function hostApplicationNotificationTemplate(
  hostProfile: EmailHostInfo,
  action: HostApplicationAction,
): EmailTemplate {
  const subjectMap: Record<HostApplicationAction, string> = {
    submitted: `New host application: ${hostProfile.displayName}`,
    approved: `Host application approved: Welcome to NomadDesk, ${hostProfile.displayName}`,
    rejected: `Host application update: ${hostProfile.displayName}`,
    suspended: `Host account suspended: ${hostProfile.displayName}`,
  };

  const headingMap: Record<HostApplicationAction, string> = {
    submitted: 'New host application received',
    approved: 'Your host application was approved',
    rejected: 'Host application not approved',
    suspended: 'Host account suspended',
  };

  const bodyMap: Record<HostApplicationAction, string> = {
    submitted: `${hostProfile.displayName} submitted a host application for cities: ${hostProfile.cities}. Please review it in the Admin Portal.`,
    approved: `Congratulations ${hostProfile.displayName}! Your host profile has been approved. You can now access the Host Portal to create and manage listings.`,
    rejected: `Thank you for applying to host with NomadDesk, ${hostProfile.displayName}. Unfortunately, we are unable to approve your application at this time.`,
    suspended: `Your host account (${hostProfile.displayName}) has been suspended by an administrator. Your listings are currently hidden from public search.`,
  };

  const reason = hostProfile.rejectionReason?.trim() || '';
  const reasonHtml = reason
    ? `<p style="margin:12px 0;padding:12px;background-color:#fafaf9;border-left:3px solid #a8a29e;font-size:14px;"><strong>Note:</strong> ${escapeHtml(reason)}</p>`
    : '';

  const html = wrapHtmlLayout(
    headingMap[action],
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">${escapeHtml(bodyMap[action])}</p>${reasonHtml}`,
  );
  const text = [
    headingMap[action],
    '',
    bodyMap[action],
    ...(reason ? ['', `Note: ${reason}`] : []),
  ].join('\n');

  return { subject: subjectMap[action], html, text };
}

export function listingModerationTemplate(
  property: Pick<Property, 'title' | 'city' | 'reference'>,
  action: ListingModerationAction,
  reason?: string | null,
): EmailTemplate {
  const isApproved = action === 'approved';
  const subject = isApproved
    ? `Listing approved: ${property.title} (${property.reference})`
    : `Listing needs changes: ${property.title} (${property.reference})`;

  const heading = isApproved ? 'Listing approved and published' : 'Listing rejected';
  const message = isApproved
    ? `Your listing "${property.title}" in ${property.city} has been approved and is now live on NomadDesk.`
    : `Your listing "${property.title}" in ${property.city} was not approved for publication.`;

  const trimmedReason = reason?.trim() || '';
  const reasonHtml = trimmedReason
    ? `<p style="margin:12px 0;padding:12px;background-color:#fafaf9;border-left:3px solid #a8a29e;font-size:14px;"><strong>Feedback:</strong> ${escapeHtml(trimmedReason)}</p>`
    : '';

  const html = wrapHtmlLayout(
    heading,
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">${escapeHtml(message)}</p>${reasonHtml}`,
  );
  const text = [
    heading,
    '',
    message,
    ...(trimmedReason ? ['', `Feedback: ${trimmedReason}`] : []),
  ].join('\n');

  return { subject, html, text };
}

export function passwordResetTemplate(email: string, resetUrl: string): EmailTemplate {
  const safeUrl = sanitizeSafeUrl(resetUrl);
  const subject = 'Reset your NomadDesk password';
  const html = wrapHtmlLayout(
    'Reset your password',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">We received a password reset request for <strong>${escapeHtml(email)}</strong>.</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;">Click the button below to choose a new password:</p>
<p style="margin:0 0 20px;"><a href="${escapeHtml(safeUrl)}" style="display:inline-block;padding:12px 20px;background-color:#1c1917;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Reset Password</a></p>
<p style="margin:0;font-size:12px;color:#78716c;">If you did not request a password reset, you can safely ignore this email.</p>`,
  );
  const text = [
    `We received a password reset request for ${email}.`,
    '',
    `Reset your password using this link: ${safeUrl}`,
    '',
    'If you did not request a password reset, you can safely ignore this email.',
  ].join('\n');

  return { subject, html, text };
}

export function contactFormTemplate(input: {
  name: string;
  email: string;
  message: string;
}): EmailTemplate {
  const subject = `Contact form inquiry from ${input.name}`;
  const html = wrapHtmlLayout(
    'New contact inquiry',
    `<p style="margin:0 0 8px;font-size:14px;"><strong>From:</strong> ${escapeHtml(input.name)} (${escapeHtml(input.email)})</p>
<p style="margin:12px 0 0;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(input.message)}</p>`,
  );
  const text = [
    `From: ${input.name} <${input.email}>`,
    '',
    input.message,
  ].join('\n');

  return { subject, html, text };
}

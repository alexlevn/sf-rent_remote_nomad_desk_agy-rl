'use client';

import { useState, useRef } from 'react';
import { submitContactInquiryAction } from '@/app/actions/contact-actions';

interface ContactFormProps {
  id?: string;
  heading?: string;
  subheading?: string;
}

export function ContactForm({
  id = 'contact',
  heading = 'Contact Support',
  subheading = 'Need assistance with a reservation or custom enterprise relocation? Drop us a note.',
}: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    if (!name.trim() || !email.trim() || !message.trim()) return;

    isSubmittingRef.current = true;
    setStatus('submitting');
    setErrorMessage(null);

    try {
      const result = await submitContactInquiryAction({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      if (result.success) {
        setStatus('success');
      } else {
        setErrorMessage(result.error || 'Unable to send your message right now.');
        setStatus('idle');
      }
    } catch {
      setErrorMessage('Unable to send your message right now. Please try again.');
      setStatus('idle');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleReset = () => {
    isSubmittingRef.current = false;
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setErrorMessage(null);
    setStatus('idle');
  };

  return (
    <div
      id={id}
      className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8 shadow-md"
    >
      <h2 className="text-2xl font-bold text-[var(--color-text-on-light)] mb-2">
        {heading}
      </h2>
      <p className="text-sm text-[var(--color-text-on-light-muted)] mb-6">
        {subheading}
      </p>

      {status === 'success' ? (
        <div
          role="alert"
          className="p-5 bg-[var(--color-success-bg)] border border-[var(--color-success-border)] rounded-xl text-[var(--color-success)] space-y-3"
        >
          <div className="flex items-center gap-2 font-semibold text-base">
            <span>✅</span>
            <span>Message sent successfully!</span>
          </div>
          <p className="text-sm text-[var(--color-text-on-light)]">
            Thank you, <strong>{name}</strong>. Our concierge team replies within one business day to{' '}
            <strong>{email}</strong>.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 text-xs font-semibold px-4 py-2 bg-white border border-[var(--color-border-light)] text-[var(--color-text-on-light)] rounded-full hover:bg-[var(--color-surface-muted)] transition-colors"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-sm text-[var(--color-error-text)]"
            >
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5">
                Your Name <span className="text-[var(--color-brand)]">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5">
                Email Address <span className="text-[var(--color-brand)]">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-subject" className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5">
              Subject
            </label>
            <input
              id="contact-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Question regarding monthly booking in Madrid"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5">
              Message <span className="text-[var(--color-brand)]">*</span>
            </label>
            <textarea
              id="contact-message"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can our concierge team assist you?"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all resize-y"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-all shadow-sm"
            >
              {status === 'submitting' ? 'Sending message...' : 'Send Message →'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

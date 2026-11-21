'use client';

import React from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface PaymentDetails {
  cardNumber: string;
  expiry: string;
  cvc: string;
}

interface MockPaymentCardProps {
  payment: PaymentDetails;
  onChange: (field: keyof PaymentDetails, value: string) => void;
  isDirectBooking: boolean;
  hostName: string;
  disabled?: boolean;
}

export const MockPaymentCard: React.FC<MockPaymentCardProps> = ({
  payment,
  onChange,
  isDirectBooking,
  hostName,
  disabled = false,
}) => {
  return (
    <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 shadow-xs">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-[var(--color-text-on-light)] tracking-tight">
          2. Payment Method
        </h2>
        <Badge variant="neutral" className="text-[11px] font-medium bg-neutral-100 text-neutral-700 border-neutral-200">
          Mock Card Driver
        </Badge>
      </div>

      {/* Mock Sandbox Card Box */}
      <div className="bg-[#faf8f5] border border-[var(--color-border-light)] rounded-xl p-4 sm:p-5 mb-4">
        <div className="mb-4">
          <label
            htmlFor="mock-card-number"
            className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
          >
            Card Number (Mock Sandbox)
          </label>
          <div className="relative">
            <input
              id="mock-card-number"
              name="cardNumber"
              type="text"
              required
              disabled={disabled}
              value={payment.cardNumber}
              onChange={(e) => onChange('cardNumber', e.target.value)}
              placeholder="4242 •••• •••• 4242"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl font-mono text-[var(--color-text-on-light)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all disabled:bg-neutral-50 disabled:text-neutral-400"
            />
            <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="mock-card-expiry"
              className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
            >
              Expires
            </label>
            <input
              id="mock-card-expiry"
              name="cardExpiry"
              type="text"
              required
              disabled={disabled}
              value={payment.expiry}
              onChange={(e) => onChange('expiry', e.target.value)}
              placeholder="12/28"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl font-mono text-[var(--color-text-on-light)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all disabled:bg-neutral-50 disabled:text-neutral-400 text-center sm:text-left"
            />
          </div>

          <div>
            <label
              htmlFor="mock-card-cvc"
              className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
            >
              CVC
            </label>
            <input
              id="mock-card-cvc"
              name="cardCvc"
              type="text"
              required
              disabled={disabled}
              value={payment.cvc}
              onChange={(e) => onChange('cvc', e.target.value)}
              placeholder="123"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl font-mono text-[var(--color-text-on-light)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all disabled:bg-neutral-50 disabled:text-neutral-400 text-center sm:text-left"
            />
          </div>
        </div>
      </div>

      {/* Authorization Hold / Instant Charge Notice */}
      <div className="flex items-start gap-2.5 text-xs text-[var(--color-text-on-light-muted)] leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-[var(--color-brand)] shrink-0 mt-0.5" />
        <div>
          {isDirectBooking ? (
            <span>
              <strong>Instant Confirmation:</strong> Your card is verified and will be charged upon confirmation. Your reservation is immediately secured without waiting for host review.
            </span>
          ) : (
            <span>
              <strong>Authorization Hold:</strong> Your card is verified and funds held. You are only charged once <strong className="text-[var(--color-text-on-light)]">{hostName}</strong> confirms your request within 48 hours.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

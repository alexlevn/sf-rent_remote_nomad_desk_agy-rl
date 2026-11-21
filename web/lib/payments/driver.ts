import crypto from 'node:crypto';
import type {
  CardInfo,
  PaymentDriver,
  PaymentTransactionResult,
} from '@/lib/payments/types';

export class PaymentDriverError extends Error {
  readonly code: 'INVALID_AMOUNT' | 'INVALID_CURRENCY' | 'INVALID_CARD' | 'INVALID_PAYMENT_REF';

  constructor(
    code: 'INVALID_AMOUNT' | 'INVALID_CURRENCY' | 'INVALID_CARD' | 'INVALID_PAYMENT_REF',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentDriverError';
    this.code = code;
  }
}

function assertValidPaymentRef(paymentRef: string): string {
  const trimmed = typeof paymentRef === 'string' ? paymentRef.trim() : '';
  if (!trimmed) {
    throw new PaymentDriverError('INVALID_PAYMENT_REF', 'Payment reference is required.');
  }
  return trimmed;
}

export class MockPaymentDriver implements PaymentDriver {
  readonly name = 'mock';

  async authorize(
    amount: number,
    currency: string,
    cardInfo: CardInfo,
  ): Promise<PaymentTransactionResult> {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new PaymentDriverError(
        'INVALID_AMOUNT',
        'Payment amount must be a positive integer in cents.',
      );
    }

    const normalizedCurrency = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      throw new PaymentDriverError('INVALID_CURRENCY', 'Currency must be a 3-letter ISO code.');
    }

    const digitsOnly =
      typeof cardInfo?.cardNumber === 'string' ? cardInfo.cardNumber.replace(/\D/g, '') : '';
    if (digitsOnly.length < 12) {
      throw new PaymentDriverError('INVALID_CARD', 'A valid mock card number is required.');
    }

    const paymentRef = `mock_txn_${crypto.randomBytes(12).toString('hex')}`;

    return {
      success: true,
      paymentRef,
      status: 'authorized',
      amount,
      currency: normalizedCurrency,
      processedAt: new Date().toISOString(),
    };
  }

  async capture(paymentRef: string): Promise<PaymentTransactionResult> {
    const ref = assertValidPaymentRef(paymentRef);
    return {
      success: true,
      paymentRef: ref,
      status: 'captured',
      processedAt: new Date().toISOString(),
    };
  }

  async void(paymentRef: string): Promise<PaymentTransactionResult> {
    const ref = assertValidPaymentRef(paymentRef);
    return {
      success: true,
      paymentRef: ref,
      status: 'voided',
      processedAt: new Date().toISOString(),
    };
  }

  async refund(paymentRef: string): Promise<PaymentTransactionResult> {
    const ref = assertValidPaymentRef(paymentRef);
    return {
      success: true,
      paymentRef: ref,
      status: 'refunded',
      processedAt: new Date().toISOString(),
    };
  }
}

export const mockPaymentDriver: PaymentDriver = new MockPaymentDriver();

export function getPaymentDriver(): PaymentDriver {
  return mockPaymentDriver;
}

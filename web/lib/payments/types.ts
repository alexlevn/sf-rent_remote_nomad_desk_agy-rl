import type { PaymentStatus } from '@/lib/types/reservation';

export interface CardInfo {
  cardNumber: string;
  expiry?: string;
  cvc?: string;
  cardholderName?: string;
}

export interface PaymentTransactionResult {
  success: boolean;
  paymentRef: string;
  status: PaymentStatus;
  amount?: number;
  currency?: string;
  processedAt: string;
  error?: string;
}

export interface PaymentDriver {
  readonly name: string;
  authorize(
    amount: number,
    currency: string,
    cardInfo: CardInfo,
  ): Promise<PaymentTransactionResult>;
  capture(paymentRef: string): Promise<PaymentTransactionResult>;
  void(paymentRef: string): Promise<PaymentTransactionResult>;
  refund(paymentRef: string): Promise<PaymentTransactionResult>;
}

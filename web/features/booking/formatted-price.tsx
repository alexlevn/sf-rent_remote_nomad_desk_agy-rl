'use client';

import React from 'react';
import { useCurrency } from '@/context/currency-context';

interface FormattedPriceProps {
  amountUSDCents: number;
  showCents?: boolean;
  perMonth?: boolean;
  className?: string;
}

export const FormattedPrice: React.FC<FormattedPriceProps> = ({
  amountUSDCents,
  showCents = false,
  perMonth = false,
  className,
}) => {
  const { formatPrice } = useCurrency();
  return <span className={className}>{formatPrice(amountUSDCents, { showCents, perMonth })}</span>;
};

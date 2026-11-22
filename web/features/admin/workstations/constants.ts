import type { WorkstationComponents } from '@/lib/types';
import { INT4_MAX } from '@/lib/format';

export const MAX_FEATURE_LENGTH = 80;
export const MAX_FEATURES_COUNT = 12;
// Keeps cents (price * 100) within Postgres INT4_MAX
export const MAX_EUR_PRICE = Math.floor(INT4_MAX / 100);

export type ComponentCategory = keyof WorkstationComponents;

export const COMPONENT_CATEGORIES: ReadonlyArray<{ key: ComponentCategory; label: string }> = [
  { key: 'monitor', label: 'Monitors' },
  { key: 'chair', label: 'Ergonomic Chairs' },
  { key: 'desk', label: 'Work Desks' },
  { key: 'keyboardMouse', label: 'Keyboard & Mouse' },
];

export function isValidEurPrice(value: number | ''): value is number {
  return value !== '' && Number.isFinite(value) && value >= 0 && value <= MAX_EUR_PRICE;
}

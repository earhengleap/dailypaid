import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const EXCHANGE_RATE = 4000; // 1 USD = 4000 Riel

export function formatCurrency(amount: number, currency: 'USD' | 'KHR') {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  } else {
    // Manually format Riel to avoid SSR/Hydration mismatches
    // Placing ៛ after the amount as is traditional in many contexts
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${formattedAmount} ៛`;
  }
}

export function convertCurrency(amount: number, from: 'USD' | 'KHR', to: 'USD' | 'KHR') {
  if (from === to) return amount;
  if (from === 'USD' && to === 'KHR') return amount * EXCHANGE_RATE;
  if (from === 'KHR' && to === 'USD') return amount / EXCHANGE_RATE;
  return amount;
}

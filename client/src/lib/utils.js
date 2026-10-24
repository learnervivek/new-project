/**
 * Utility to merge class names conditionally
 */
export function cn(...inputs) {
  return inputs
    .flatMap((input) => {
      if (!input) return [];
      if (typeof input === 'string') return input.split(' ');
      if (typeof input === 'object') {
        return Object.entries(input)
          .filter(([_, value]) => Boolean(value))
          .map(([key]) => key);
      }
      return [];
    })
    .filter(Boolean)
    .join(' ');
}

export { formatINR, formatPaiseToINR, formatCurrency } from '../utils/currency';


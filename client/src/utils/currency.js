/**
 * Indian Rupee (INR) and Multi-currency Formatting Utilities
 * Standardizes currency presentation across TripTally for Indian travellers.
 */

/**
 * Format a number into Indian Rupees (INR) using Indian number grouping (lakhs/crores).
 * e.g., 125000 -> ₹1,25,000
 * @param {number|string} amount
 * @param {object} [options]
 * @returns {string}
 */
export const formatINR = (amount, options = {}) => {
  const numericAmount = Number(amount) || 0;
  const hasDecimals = numericAmount % 1 !== 0;
  const {
    maximumFractionDigits = options.maximumFractionDigits ?? (hasDecimals ? 2 : 0),
    minimumFractionDigits = options.minimumFractionDigits ?? (hasDecimals ? 2 : 0),
    showSymbol = true,
  } = options;

  try {
    if (!showSymbol) {
      return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits,
        minimumFractionDigits,
      }).format(numericAmount);
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits,
      minimumFractionDigits,
    }).format(numericAmount);
  } catch {
    return `₹${numericAmount.toLocaleString('en-IN')}`;
  }
};

/**
 * Format minor units (paise) into INR
 * @param {number} paise
 * @param {object} [options]
 */
export const formatPaiseToINR = (paise, options = {}) => {
  return formatINR((Number(paise) || 0) / 100, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    ...options,
  });
};

/**
 * Universal currency formatter standardized to Indian Rupees (₹) across the platform
 */
export const formatCurrency = (amount, currency = 'INR', options = {}) => {
  return formatINR(amount, options);
};

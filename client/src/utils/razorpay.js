/**
 * Dynamically loads the Razorpay checkout script if not already present on window
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load checkout.js script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Open Razorpay Checkout Modal
 * @param {Object} options
 * @param {string} options.key - Razorpay public key ID
 * @param {number} options.amount - Amount in minor units
 * @param {string} options.currency - Currency code
 * @param {string} options.order_id - Razorpay order ID
 * @param {string} options.name - App / merchant title
 * @param {string} options.description - Payment description
 * @param {Object} options.prefill - Customer name, email, contact
 * @param {Function} options.onSuccess - Callback on payment captured
 * @param {Function} options.onDismiss - Callback on checkout modal closed
 */
export const openRazorpayModal = async ({
  key,
  amount,
  currency = 'INR',
  order_id,
  name = 'TripTally',
  description = 'Trip Settlement Payment',
  prefill = {},
  onSuccess,
  onDismiss,
}) => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Could not load Razorpay payment SDK. Please check your internet connection.');
  }

  const rzpOptions = {
    key,
    amount,
    currency,
    name,
    description,
    order_id,
    prefill: {
      name: prefill.name || '',
      email: prefill.email || '',
      contact: prefill.contact || '',
    },
    theme: {
      color: '#1b4332', // TripTally forest-700
    },
    modal: {
      ondismiss: () => {
        onDismiss?.();
      },
      escape: true,
      backdropclose: false,
    },
    handler: function (response) {
      // response: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
      onSuccess?.(response);
    },
  };

  const razorpayInstance = new window.Razorpay(rzpOptions);

  razorpayInstance.on('payment.failed', function (response) {
    console.warn('[Razorpay] Payment failed:', response.error);
  });

  razorpayInstance.open();
  return razorpayInstance;
};

export default {
  loadRazorpayScript,
  openRazorpayModal,
};

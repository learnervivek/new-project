import React, { useState, useEffect } from 'react';
import { X, Handshake, ArrowRight, IndianRupee, Calendar, CreditCard, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import tripService from '../../services/tripService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { openRazorpayModal } from '../../utils/razorpay';

const BASE_PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI (GPay, PhonePe, Paytm, BHIM)' },
  { value: 'cash', label: 'Cash in Hand' },
  { value: 'razorpay', label: 'Razorpay (Online Card / Netbanking)' },
  { value: 'bank_transfer', label: 'Bank Transfer (IMPS / NEFT)' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' },
];

export function SettlementModal({
  isOpen,
  onClose,
  trip,
  members = [],
  prefill = null, // { fromUser, toUser, amountMinor, settlementId, forceRazorpay }
  onSaved,
}) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const currency = trip?.currency || 'INR';

  const [payer, setPayer] = useState('');
  const [payee, setPayee] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentConfig, setPaymentConfig] = useState({ enabled: false, testMode: true, keyId: '' });

  // Compile full members list
  const allMembers = React.useMemo(() => {
    const list = [];
    if (trip?.owner) {
      const ownerUser = trip.owner;
      list.push({
        _id: String(ownerUser._id || ownerUser),
        name: ownerUser.name || 'Trip Owner',
        email: ownerUser.email || '',
        avatar: ownerUser.avatar || '',
        isOwner: true,
      });
    }

    (members || []).forEach((m) => {
      const u = m.user || m;
      const uid = String(u._id || u.id || u);
      if (!list.some((existing) => existing._id === uid)) {
        list.push({
          _id: uid,
          name: u.name || 'Companion',
          email: u.email || '',
          avatar: u.avatar || '',
        });
      }
    });

    return list;
  }, [trip?.owner, members]);

  // Load payment config
  useEffect(() => {
    if (isOpen) {
      tripService
        .getPaymentConfig()
        .then((res) => {
          if (res?.success) {
            setPaymentConfig(res);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (prefill) {
        setPayer(String(prefill.fromUser?._id || prefill.fromUser || ''));
        setPayee(String(prefill.toUser?._id || prefill.toUser || ''));
        if (prefill.amountMinor) {
          setAmountInput((prefill.amountMinor / 100).toFixed(2));
        } else {
          setAmountInput('');
        }
        if (prefill.forceRazorpay) {
          setPaymentMethod('razorpay');
        } else {
          setPaymentMethod('cash');
        }
      } else {
        setPayer(allMembers[0]?._id || '');
        setPayee(allMembers[1]?._id || '');
        setAmountInput('');
        setPaymentMethod('cash');
      }
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setErrors({});
    }
  }, [isOpen, prefill, allMembers]);

  if (!isOpen) return null;

  const isCurrentUserPayer = currentUser && String(payer) === String(currentUser._id || currentUser.id);

  const validate = () => {
    const errs = {};
    if (!payer) errs.payer = 'Please select payer';
    if (!payee) errs.payee = 'Please select payee';
    if (payer && payee && payer === payee) {
      errs.payee = 'Payer and payee cannot be the same member';
    }
    if (!amountInput || parseFloat(amountInput) <= 0) {
      errs.amount = 'Amount must be greater than zero';
    }
    if (paymentMethod === 'razorpay') {
      if (!paymentConfig.enabled) {
        errs.paymentMethod = 'Razorpay is not configured on this server. Please choose a manual payment method.';
      } else if (!isCurrentUserPayer) {
        errs.payer = 'To initiate an online checkout, you must be the designated payer.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const amountMinor = Math.round(parseFloat(amountInput) * 100);

    try {
      // Branch 1: Razorpay Online Payment Checkout
      if (paymentMethod === 'razorpay') {
        const orderPayload = prefill?.settlementId
          ? { settlementId: prefill.settlementId, notes: notes.trim() }
          : { payeeId: payee, amount: amountMinor, notes: notes.trim() };

        const orderRes = await tripService.createPaymentOrder(trip._id, orderPayload);
        if (!orderRes?.success || !orderRes.order) {
          throw new Error(orderRes?.message || 'Could not initiate Razorpay order');
        }

        const { order, paymentOrderId, settlementId } = orderRes;

        // Open Razorpay Checkout modal
        await openRazorpayModal({
          key: order.keyId || paymentConfig.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.id,
          name: 'TripTally',
          description: `Settlement for ${trip?.title || 'Trip'}`,
          prefill: {
            name: currentUser?.name || '',
            email: currentUser?.email || '',
          },
          onSuccess: async (response) => {
            try {
              // Cryptographically verify payment on server
              const verifyRes = await tripService.verifyPayment(trip._id, {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                paymentOrderId,
              });

              if (verifyRes.success) {
                toast.success('Payment Verified!', `Paid ${(order.amount / 100).toFixed(2)} ${order.currency} via Razorpay.`);
                onSaved?.(verifyRes.settlement);
                onClose();
              } else {
                toast.error('Verification Failed', verifyRes.message || 'Signature could not be verified.');
              }
            } catch (vErr) {
              toast.error('Verification Error', vErr.message || 'Server failed to verify payment.');
            } finally {
              setLoading(false);
            }
          },
          onDismiss: () => {
            setLoading(false);
            toast.info('Checkout Cancelled', 'Payment window was closed. Settlement recorded in pending state.');
            onSaved?.();
            onClose();
          },
        });
      }
      // Branch 2: Standard Manual Settlement (Cash, UPI, Venmo, etc.)
      else {
        const res = await tripService.createSettlement(trip._id, {
          payer,
          payee,
          amount: amountMinor,
          paymentMethod,
          date,
          notes: notes.trim(),
        });

        if (res.success) {
          toast.success('Settlement Recorded', `Payment of ₹${amountInput} has been logged.`);
          onSaved?.(res.settlement);
          onClose();
        }
      }
    } catch (err) {
      toast.error('Failed to Settle', err.message || 'Could not record settlement.');
    } finally {
      if (paymentMethod !== 'razorpay') {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-soft-2xl border border-ivory-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ivory-200 bg-ivory-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-terracotta-600 text-white flex items-center justify-center shadow-soft-sm">
              <Handshake className="w-5 h-5 text-ivory-50" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-charcoal-900 font-display">Record Settlement</h3>
                {paymentMethod === 'razorpay' && paymentConfig.testMode && (
                  <Badge variant="warning" size="sm">Test Mode</Badge>
                )}
              </div>
              <p className="text-xs text-charcoal-500">Log an online or manual payment between companions.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-charcoal-400 hover:text-charcoal-900 hover:bg-ivory-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Payer and Payee Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Payer (Who pays) *</label>
              <select
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-900 outline-none focus:border-forest-500"
              >
                {allMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} {m.isOwner ? '(Owner)' : ''} {currentUser && String(m._id) === String(currentUser._id || currentUser.id) ? '• (You)' : ''}
                  </option>
                ))}
              </select>
              {errors.payer && <p className="text-[11px] text-rose-500">{errors.payer}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Payee (Who receives) *</label>
              <select
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-900 outline-none focus:border-forest-500"
              >
                {allMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} {m.isOwner ? '(Owner)' : ''} {currentUser && String(m._id) === String(currentUser._id || currentUser.id) ? '• (You)' : ''}
                  </option>
                ))}
              </select>
              {errors.payee && <p className="text-[11px] text-rose-500">{errors.payee}</p>}
            </div>
          </div>

          {/* Amount & Currency */}
          <div className="space-y-1">
            <label className="font-bold text-charcoal-700">Settlement Amount ({currency}) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-charcoal-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border bg-white font-mono font-bold text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 ${
                  errors.amount ? 'border-rose-400' : 'border-ivory-300'
                }`}
              />
            </div>
            {errors.amount && <p className="text-[11px] text-rose-500">{errors.amount}</p>}
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-800 outline-none focus:border-forest-500"
              >
                {BASE_PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label} {pm.value === 'razorpay' && !paymentConfig.enabled ? ' (Unavailable)' : ''}
                  </option>
                ))}
              </select>
              {errors.paymentMethod && <p className="text-[11px] text-rose-500">{errors.paymentMethod}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-800 outline-none focus:border-forest-500"
              />
            </div>
          </div>

          {/* Razorpay Information Box */}
          {paymentMethod === 'razorpay' && (
            <div className="p-3.5 rounded-2xl bg-forest-50 border border-forest-200 space-y-2">
              <div className="flex items-center gap-2 text-forest-800 font-bold">
                <ShieldCheck className="w-4 h-4 text-forest-700" />
                <span>Razorpay Test-Mode Checkout</span>
              </div>
              <p className="text-[11px] text-forest-700 leading-relaxed">
                Processes payment into the trip's standard merchant settlement arrangement. After completing payment in the test checkout popup, the signature is cryptographically verified on the backend before completing the settlement.
              </p>
              {!paymentConfig.enabled && (
                <div className="flex items-center gap-1.5 text-rose-600 font-semibold text-[11px] bg-rose-50 p-2 rounded-xl border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Razorpay credentials not configured. Please use manual settlement.</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="font-bold text-charcoal-700">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Venmo #1234, cash at dinner, or hotel bill share"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-ivory-300 text-xs outline-none focus:border-forest-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-ivory-200">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant={paymentMethod === 'razorpay' ? 'primary' : 'accent'}
              size="sm"
              type="submit"
              loading={loading}
              disabled={paymentMethod === 'razorpay' && !paymentConfig.enabled}
            >
              {paymentMethod === 'razorpay'
                ? `Pay with Razorpay (₹${amountInput || '0.00'})`
                : 'Confirm Settlement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettlementModal;

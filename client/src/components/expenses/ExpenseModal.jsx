import React, { useState, useEffect } from 'react';
import {
  X,
  IndianRupee,
  Calendar,
  Tag,
  User,
  Users,
  FileText,
  Upload,
  Check,
  AlertCircle,
  Receipt,
  RotateCcw
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import tripService from '../../services/tripService';
import { useToast } from '../../context/ToastContext';

const CATEGORIES = [
  { value: 'lodging', label: 'Lodging / Stays' },
  { value: 'dining', label: 'Dining & Drinks' },
  { value: 'transport', label: 'Transit & Flights' },
  { value: 'activity', label: 'Sightseeing & Tours' },
  { value: 'groceries', label: 'Groceries & Supplies' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other / Misc' },
];

export function ExpenseModal({
  isOpen,
  onClose,
  trip,
  members = [],
  expense = null, // for editing
  onSaved,
  currentUserId,
}) {
  const { toast } = useToast();

  const currency = trip?.currency || 'INR';
  const isEditing = Boolean(expense);

  // Form states
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState(''); // in major units (e.g. "45.00")
  const [category, setCategory] = useState('dining');
  const [type, setType] = useState('expense');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [customSplits, setCustomSplits] = useState({}); // { [userId]: "30.00" }
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Compile full members list (owner + accepted members)
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
          role: m.role || 'member',
        });
      }
    });

    return list;
  }, [trip?.owner, members]);

  // Populate form on open / edit
  useEffect(() => {
    if (expense) {
      setTitle(expense.title || '');
      setAmountInput((expense.amount / 100).toFixed(2));
      setCategory(expense.category || 'other');
      setType(expense.type || 'expense');
      setPaidBy(String(expense.paidBy?._id || expense.paidBy));
      setSplitType(expense.splitType || 'equal');
      setDate(
        expense.date
          ? new Date(expense.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setNotes(expense.notes || '');
      setReceiptUrl(expense.receiptUrl || '');

      if (expense.splitType === 'equal') {
        setSelectedParticipants(expense.splits?.map((s) => String(s.user?._id || s.user)) || []);
      } else {
        const splitsObj = {};
        (expense.splits || []).forEach((s) => {
          const uid = String(s.user?._id || s.user);
          splitsObj[uid] = (s.amount / 100).toFixed(2);
        });
        setCustomSplits(splitsObj);
      }
    } else {
      // Defaults for new expense
      setTitle('');
      setAmountInput('');
      setCategory('dining');
      setType('expense');
      setPaidBy(currentUserId || allMembers[0]?._id || '');
      setSplitType('equal');
      setSelectedParticipants(allMembers.map((m) => m._id));
      setCustomSplits({});
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setReceiptUrl('');
      setErrors({});
    }
  }, [expense, isOpen, allMembers, currentUserId]);

  if (!isOpen) return null;

  // Numeric amount in minor units (integer cents/paise)
  const totalMinor = Math.round(parseFloat(amountInput || '0') * 100);

  // Equal split per-person preview
  const equalCount = selectedParticipants.length;
  const equalSharePerPerson =
    equalCount > 0 && totalMinor > 0 ? (totalMinor / equalCount / 100).toFixed(2) : '0.00';

  // Custom split sum in minor units
  const customSumMinor = Object.values(customSplits).reduce(
    (acc, val) => acc + Math.round(parseFloat(val || '0') * 100),
    0
  );
  const customDifferenceMinor = totalMinor - customSumMinor;

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const res = await tripService.uploadReceipt(trip._id, file);
      if (res.success && res.receiptUrl) {
        setReceiptUrl(res.receiptUrl);
        toast.success('Receipt Uploaded', 'Attachment linked to this expense.');
      }
    } catch (err) {
      toast.error('Upload Failed', err.message || 'Could not upload receipt.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleDistributeCustomEqually = () => {
    if (totalMinor <= 0 || allMembers.length === 0) return;
    const base = Math.floor(totalMinor / allMembers.length);
    const rem = totalMinor % allMembers.length;
    const newSplits = {};
    allMembers.forEach((m, idx) => {
      const share = idx < rem ? base + 1 : base;
      newSplits[m._id] = (share / 100).toFixed(2);
    });
    setCustomSplits(newSplits);
  };

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!amountInput || parseFloat(amountInput) <= 0) errs.amount = 'Amount must be greater than zero';
    if (!paidBy) errs.paidBy = 'Please select who paid';

    if (splitType === 'equal') {
      if (selectedParticipants.length === 0) {
        errs.splits = 'Select at least one participant';
      }
    } else {
      if (customSumMinor !== totalMinor) {
        errs.splits = `Custom splits (${formatCurrency(customSumMinor / 100, currency)}) must equal total amount (${formatCurrency(totalMinor / 100, currency)})`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        amount: totalMinor,
        currency,
        category,
        type,
        paidBy,
        splitType,
        date,
        notes: notes.trim(),
        receiptUrl,
      };

      if (splitType === 'equal') {
        payload.participants = selectedParticipants;
      } else {
        payload.splits = Object.entries(customSplits)
          .map(([userId, amtStr]) => ({
            user: userId,
            amount: Math.round(parseFloat(amtStr || '0') * 100),
          }))
          .filter((s) => s.amount > 0);
      }

      let res;
      if (isEditing) {
        res = await tripService.updateExpense(trip._id, expense._id, payload);
      } else {
        res = await tripService.createExpense(trip._id, payload);
      }

      if (res.success) {
        toast.success(
          isEditing ? 'Expense Updated' : 'Expense Recorded',
          `"${payload.title}" has been added to the trip tally.`
        );
        onSaved?.(res.expense);
        onClose();
      }
    } catch (err) {
      toast.error('Save Failed', err.message || 'Could not save expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-soft-2xl border border-ivory-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ivory-200 bg-ivory-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-forest-800 text-white flex items-center justify-center shadow-soft-sm">
              <Receipt className="w-5 h-5 text-terracotta-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal-900 font-display">
                {isEditing ? 'Edit Expense' : 'Log New Expense'}
              </h3>
              <p className="text-xs text-charcoal-500">Record payments and split costs with companions.</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-charcoal-700">Expense Title *</label>
              <input
                type="text"
                placeholder="e.g. Airbnb Lakehouse, Grocery run"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-forest-500/20 ${
                  errors.title ? 'border-rose-400' : 'border-ivory-300'
                }`}
              />
              {errors.title && <p className="text-[11px] text-rose-500">{errors.title}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Entry Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-800 outline-none focus:border-forest-500"
              >
                <option value="expense">Expense</option>
                <option value="refund">Refund / Credit</option>
              </select>
            </div>
          </div>

          {/* Amount & Currency & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Total Amount ({currency}) *</label>
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
                  className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border bg-white font-mono font-bold text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-forest-500/20 ${
                    errors.amount ? 'border-rose-400' : 'border-ivory-300'
                  }`}
                />
              </div>
              {errors.amount && <p className="text-[11px] text-rose-500">{errors.amount}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-800 outline-none focus:border-forest-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paid By & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Paid By *</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-800 outline-none focus:border-forest-500"
              >
                {allMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} {m.isOwner ? '(Owner)' : ''}
                  </option>
                ))}
              </select>
              {errors.paidBy && <p className="text-[11px] text-rose-500">{errors.paidBy}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Expense Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-800 outline-none focus:border-forest-500"
              >
              </input>
            </div>
          </div>

          {/* Split Mode Toggle */}
          <div className="space-y-2 pt-2 border-t border-ivory-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-charcoal-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-forest-700" />
                How to split this cost?
              </label>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-ivory-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSplitType('equal')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    splitType === 'equal' ? 'bg-white text-forest-900 shadow-soft-sm font-bold' : 'text-charcoal-600'
                  }`}
                >
                  Split Equally
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('custom')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    splitType === 'custom' ? 'bg-white text-forest-900 shadow-soft-sm font-bold' : 'text-charcoal-600'
                  }`}
                >
                  Custom Split
                </button>
              </div>
            </div>

            {/* Split Mode 1: Equal Split */}
            {splitType === 'equal' && (
              <div className="p-3.5 rounded-2xl bg-ivory-100/70 border border-ivory-200 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-charcoal-500">
                  <span>Included Companions ({selectedParticipants.length})</span>
                  {totalMinor > 0 && (
                    <span className="font-bold text-forest-800 font-mono">
                      ~${equalSharePerPerson} / person
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {allMembers.map((m) => {
                    const isSelected = selectedParticipants.includes(m._id);
                    return (
                      <label
                        key={m._id}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-white border-forest-500 text-forest-900 font-bold shadow-soft-xs'
                            : 'bg-ivory-50/70 border-ivory-300 text-charcoal-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParticipants([...selectedParticipants, m._id]);
                            } else {
                              setSelectedParticipants(selectedParticipants.filter((id) => id !== m._id));
                            }
                          }}
                          className="w-3.5 h-3.5 accent-forest-700 rounded"
                        />
                        <span className="truncate text-xs">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Split Mode 2: Custom Split */}
            {splitType === 'custom' && (
              <div className="p-3.5 rounded-2xl bg-ivory-100/70 border border-ivory-200 space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-charcoal-600">Assign specific amounts</span>
                  <button
                    type="button"
                    onClick={handleDistributeCustomEqually}
                    className="text-forest-700 hover:text-forest-900 font-bold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Distribute Equally
                  </button>
                </div>

                <div className="space-y-2">
                  {allMembers.map((m) => (
                    <div key={m._id} className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-ivory-300">
                      <span className="text-xs font-medium text-charcoal-900 truncate">{m.name}</span>
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-charcoal-400 text-xs">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={customSplits[m._id] || ''}
                          onChange={(e) => {
                            setCustomSplits({
                              ...customSplits,
                              [m._id]: e.target.value,
                            });
                          }}
                          className="w-full pl-6 pr-2 py-1 text-xs rounded-lg border border-ivory-300 font-mono font-bold text-right outline-none focus:border-forest-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Validation Status Bar */}
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                    customDifferenceMinor === 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}
                >
                  <span>
                    Allocated: ${(customSumMinor / 100).toFixed(2)} / ${(totalMinor / 100).toFixed(2)}
                  </span>
                  <span>
                    {customDifferenceMinor === 0 ? (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <Check className="w-3.5 h-3.5" /> Balanced
                      </span>
                    ) : customDifferenceMinor > 0 ? (
                      `$${(customDifferenceMinor / 100).toFixed(2)} remaining`
                    ) : (
                      `$${Math.abs(customDifferenceMinor / 100).toFixed(2)} over limit`
                    )}
                  </span>
                </div>
              </div>
            )}

            {errors.splits && <p className="text-[11px] text-rose-500 font-medium">{errors.splits}</p>}
          </div>

          {/* Receipt Upload & Notes */}
          <div className="space-y-3 pt-2 border-t border-ivory-200">
            <div className="space-y-1">
              <label className="font-bold text-charcoal-700 flex items-center justify-between">
                <span>Receipt Attachment (Optional)</span>
                {receiptUrl && (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Receipt Attached
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 cursor-pointer text-xs font-semibold text-charcoal-700 transition-colors shrink-0">
                  <Upload className="w-3.5 h-3.5 text-forest-700" />
                  <span>{uploadingReceipt ? 'Uploading...' : 'Upload File'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleReceiptUpload}
                    disabled={uploadingReceipt}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  placeholder="Or enter receipt image URL directly..."
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-ivory-300 text-xs outline-none focus:border-forest-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Notes & Comments</label>
              <textarea
                rows={2}
                placeholder="Add any extra details, receipt notes, or invoice codes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-ivory-300 text-xs outline-none focus:border-forest-500"
              />
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-ivory-200">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={loading}>
              {isEditing ? 'Save Changes' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExpenseModal;

import React, { useState, useEffect, useMemo } from 'react';
import {
  IndianRupee,
  Plus,
  Receipt,
  Handshake,
  Filter,
  Search,
  Calendar,
  User,
  Users,
  ArrowRight,
  Check,
  AlertCircle,
  ExternalLink,
  Edit2,
  Trash2,
  TrendingUp,
  CreditCard,
  X
} from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ui/ConfirmDialog';
import ExpenseModal from './ExpenseModal';
import SettlementModal from './SettlementModal';
import tripService from '../../services/tripService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/utils';

const CATEGORY_MAP = {
  lodging: { label: 'Lodging', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  dining: { label: 'Dining', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  transport: { label: 'Transport', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  activity: { label: 'Activity', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  groceries: { label: 'Groceries', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  entertainment: { label: 'Entertainment', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

export function ExpenseManager({ trip, members = [], canEdit = false }) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const currency = trip?.currency || 'INR';

  const [activeSubTab, setActiveSubTab] = useState('expenses'); // 'expenses' | 'settlements'
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settlementsViewMode, setSettlementsViewMode] = useState('settlements'); // 'settlements' | 'payments'

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');

  // Modals state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [settlementPrefill, setSettlementPrefill] = useState(null);

  // Deletion dialog states
  const [deleteExpenseItem, setDeleteExpenseItem] = useState(null);
  const [deleteSettlementItem, setDeleteSettlementItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load expenses, settlements, balances, and payments from authoritative backend
  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, setRes, balRes, payRes] = await Promise.all([
        tripService.getExpenses(trip._id),
        tripService.getSettlements(trip._id),
        tripService.getExpenseBalances(trip._id),
        typeof tripService.getTripPayments === 'function'
          ? tripService.getTripPayments(trip._id).catch(() => ({ success: false, payments: [] }))
          : Promise.resolve({ success: true, payments: [] }),
      ]);

      if (expRes.success) setExpenses(expRes.expenses || []);
      if (setRes.success) setSettlements(setRes.settlements || []);
      if (balRes.success) setBalances(balRes.balances || null);
      if (payRes?.success) setPayments(payRes.payments || []);
    } catch (err) {
      console.error('Failed to load expense data:', err);
      toast.error('Load Error', err.message || 'Could not load expense data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trip?._id) {
      loadData();
    }
  }, [trip?._id]);

  // Client-side filtering of expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
      if (memberFilter !== 'all') {
        const payerId = String(exp.paidBy?._id || exp.paidBy);
        if (payerId !== memberFilter) return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = exp.title?.toLowerCase().includes(query);
        const matchesPayer = exp.paidBy?.name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesPayer) return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, memberFilter, search]);

  // Current user's net balance summary
  const currentUserLedger = useMemo(() => {
    if (!balances?.memberLedgers || !currentUser?._id) return null;
    return balances.memberLedgers.find((m) => m.user._id === String(currentUser._id));
  }, [balances, currentUser?._id]);

  // Handlers for deleting an expense
  const handleDeleteExpenseConfirm = async () => {
    if (!deleteExpenseItem) return;
    setDeleteLoading(true);
    try {
      const res = await tripService.deleteExpense(trip._id, deleteExpenseItem._id);
      if (res.success) {
        toast.info('Expense Deleted', 'Removed from trip ledger.');
        setDeleteExpenseItem(null);
        loadData();
      }
    } catch (err) {
      toast.error('Delete Failed', err.message || 'Could not delete expense.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handlers for deleting a settlement
  const handleDeleteSettlementConfirm = async () => {
    if (!deleteSettlementItem) return;
    setDeleteLoading(true);
    try {
      const res = await tripService.deleteSettlement(trip._id, deleteSettlementItem._id);
      if (res.success) {
        toast.info('Settlement Removed', 'Reversed transaction impact on balances.');
        setDeleteSettlementItem(null);
        loadData();
      }
    } catch (err) {
      toast.error('Delete Failed', err.message || 'Could not remove settlement.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 1-Click "Settle" from suggested settlements
  const handleQuickSettle = (suggestion) => {
    setSettlementPrefill({
      fromUser: suggestion.from,
      toUser: suggestion.to,
      amountMinor: suggestion.amount,
      forceRazorpay: false,
    });
    setSettlementModalOpen(true);
  };

  // 1-Click "Pay Online" with Razorpay from suggested settlements
  const handleQuickPayOnline = (suggestion) => {
    setSettlementPrefill({
      fromUser: suggestion.from,
      toUser: suggestion.to,
      amountMinor: suggestion.amount,
      forceRazorpay: true,
    });
    setSettlementModalOpen(true);
  };

  const totalSpentMajor = balances?.totalSpent ? (balances.totalSpent / 100).toFixed(2) : '0.00';
  const totalSettledMajor = balances?.totalSettled ? (balances.totalSettled / 100).toFixed(2) : '0.00';
  const targetBudget = trip.budget || 0;
  const budgetPercent = targetBudget > 0 ? Math.min(100, Math.round((parseFloat(totalSpentMajor) / targetBudget) * 100)) : 0;

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Summary Overview Cards */}
      <Card variant="default" className="p-6 shadow-soft border border-ivory-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-ivory-200">
          <div>
            <span className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              Collaborative Ledger & Debt Tally
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-charcoal-900 font-display mt-0.5">
              Trip Expenses & Settlements
            </h3>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSettlementPrefill(null);
                  setSettlementModalOpen(true);
                }}
                leftIcon={<Handshake className="w-4 h-4 text-terracotta-600" />}
              >
                Settle Up
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseModalOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Log Expense
              </Button>
            </div>
          )}
        </div>

        {/* Top Summary Stats */}
        <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Spent vs Budget */}
          <div className="p-4 rounded-2xl bg-ivory-100/80 border border-ivory-200 space-y-2">
            <span className="text-xs font-semibold text-charcoal-500">Total Spent</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-forest-800 font-mono">
                {formatCurrency(totalSpentMajor)}
              </span>
              <span className="text-xs text-charcoal-500 font-mono">
                Budget: {formatCurrency(targetBudget)}
              </span>
            </div>
            {targetBudget > 0 && (
              <div className="w-full bg-ivory-300 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetPercent > 90 ? 'bg-rose-500' : 'bg-forest-600'
                  }`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
            )}
          </div>

          {/* Settled Payments */}
          <div className="p-4 rounded-2xl bg-ivory-100/80 border border-ivory-200 space-y-1">
            <span className="text-xs font-semibold text-charcoal-500">Total Settled Up</span>
            <p className="text-2xl font-bold text-charcoal-900 font-mono">
              {formatCurrency(totalSettledMajor)}
            </p>
            <p className="text-[11px] text-charcoal-500">
              {settlements.length} {settlements.length === 1 ? 'settlement recorded' : 'settlements recorded'}
            </p>
          </div>

          {/* User's Net Status */}
          <div className="p-4 rounded-2xl bg-ivory-100/80 border border-ivory-200 space-y-1">
            <span className="text-xs font-semibold text-charcoal-500">Your Current Balance</span>
            {currentUserLedger ? (
              <div>
                <p
                  className={`text-2xl font-bold font-mono ${
                    currentUserLedger.netBalance > 0
                      ? 'text-emerald-700'
                      : currentUserLedger.netBalance < 0
                      ? 'text-terracotta-700'
                      : 'text-charcoal-700'
                  }`}
                >
                  {currentUserLedger.netBalance > 0
                    ? `+${formatCurrency(currentUserLedger.netBalance / 100)}`
                    : currentUserLedger.netBalance < 0
                    ? `-${formatCurrency(Math.abs(currentUserLedger.netBalance) / 100)}`
                    : '₹0'}
                </p>
                <p className="text-[11px] text-charcoal-500 font-medium">
                  {currentUserLedger.netBalance > 0
                    ? 'Companions owe you money'
                    : currentUserLedger.netBalance < 0
                    ? 'You owe companions money'
                    : 'All settled up!'}
                </p>
              </div>
            ) : (
              <p className="text-sm font-bold text-charcoal-600">₹0</p>
            )}
          </div>
        </div>
      </Card>

      {/* 2. Member Balances & Debt Simplification Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Net Balances for each companion */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="default" className="shadow-soft border border-ivory-300">
            <CardHeader className="border-b border-ivory-200 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-display">Companion Net Balances</CardTitle>
                <CardDescription>Calculated from authoritative expenses and recorded settlements.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {balances?.memberLedgers?.map((ledger) => {
                const net = ledger.netBalance || 0;
                const isPositive = net > 0;
                const isNegative = net < 0;

                return (
                  <div
                    key={ledger.user._id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-ivory-50 border border-ivory-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-forest-700 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                        {ledger.user.avatar ? (
                          <img src={ledger.user.avatar} alt={ledger.user.name} className="w-full h-full object-cover" />
                        ) : (
                          ledger.user.name?.charAt(0).toUpperCase() || 'C'
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-charcoal-900 truncate">
                          {ledger.user.name} {currentUser?._id === ledger.user._id && <span className="text-forest-700 font-semibold">(You)</span>}
                        </p>
                        <p className="text-[11px] text-charcoal-400">
                          Paid: {formatCurrency(ledger.totalPaid / 100)} • Share: {formatCurrency(ledger.totalShare / 100)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-bold font-mono ${
                          isPositive
                            ? 'text-emerald-700'
                            : isNegative
                            ? 'text-terracotta-700'
                            : 'text-charcoal-500'
                        }`}
                      >
                        {isPositive ? `+` : isNegative ? `-` : ''}{formatCurrency(Math.abs(net / 100))}
                      </span>
                      <p className="text-[10px] text-charcoal-400 font-medium capitalize">
                        {isPositive ? 'Receives' : isNegative ? 'Owes' : 'Settled'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Suggested Settlements (Who owes whom) */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="default" className="shadow-soft border border-ivory-300">
            <CardHeader className="border-b border-ivory-200 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-display">Suggested Settlements</CardTitle>
                <CardDescription>Minimum transactions needed to settle all debts.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {balances?.suggestedSettlements?.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                  <Check className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                  <p className="font-bold">Everyone is all settled up!</p>
                  <p className="text-[11px] text-emerald-600">No outstanding debts remain between companions.</p>
                </div>
              ) : (
                balances?.suggestedSettlements?.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white border border-ivory-300 flex items-center justify-between gap-2 shadow-soft-xs"
                  >
                    <div className="min-w-0 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-charcoal-900">
                        <span className="truncate">{s.from.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                        <span className="truncate">{s.to.name}</span>
                      </div>
                      <span className="font-mono font-bold text-terracotta-600 text-xs">
                        {formatCurrency(s.amount / 100)}
                      </span>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {String(s.from?._id || s.from) === String(currentUser?._id) && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleQuickPayOnline(s)}
                            className="text-[11px] h-7 px-2.5"
                          >
                            Pay Online
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickSettle(s)}
                          className="text-[11px] h-7 px-2.5"
                        >
                          Settle
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* 3. Sub-Tab Switcher & Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white border border-ivory-300 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ivory-200">
          
          {/* Sub-tab pills */}
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-ivory-200/80 border border-ivory-300 w-fit">
            <button
              type="button"
              onClick={() => setActiveSubTab('expenses')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'expenses'
                  ? 'bg-white text-forest-900 shadow-soft-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-forest-700" />
              <span>Trip Expenses ({expenses.length})</span>
            </button>

            <button
              type="button"
              data-testid="settlements-tab"
              onClick={() => setActiveSubTab('settlements')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'settlements'
                  ? 'bg-white text-forest-900 shadow-soft-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Handshake className="w-3.5 h-3.5 text-terracotta-600" />
              <span>Settlement History ({settlements.length})</span>
            </button>
          </div>

          {/* Search bar */}
          {activeSubTab === 'expenses' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search expenses or payer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-ivory-300 text-xs outline-none focus:border-forest-500"
              />
            </div>
          )}
        </div>

        {/* Category & Member Filter Selectors */}
        {activeSubTab === 'expenses' && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-charcoal-500 text-[11px]">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-800 outline-none"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_MAP).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-charcoal-500 text-[11px]">Paid By:</span>
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-ivory-300 bg-white font-medium text-charcoal-800 outline-none"
              >
                <option value="all">All Companions</option>
                {balances?.memberLedgers?.map((m) => (
                  <option key={m.user._id} value={m.user._id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>

            {(categoryFilter !== 'all' || memberFilter !== 'all' || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter('all');
                  setMemberFilter('all');
                  setSearch('');
                }}
                className="h-7 text-[11px] text-terracotta-700"
              >
                Reset Filters
              </Button>
            )}
          </div>
        )}

        {/* Tab 1: Expenses List */}
        {activeSubTab === 'expenses' && (
          <div className="space-y-3 pt-2">
            {filteredExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={expenses.length === 0 ? 'No Expenses Logged Yet' : 'No Matching Expenses Found'}
                description={
                  expenses.length === 0
                    ? 'Start tracking group spending on villas, food, activities, or flights.'
                    : 'Try broadening your filter criteria or clearing search.'
                }
                actionLabel={canEdit && expenses.length === 0 ? 'Log First Expense' : undefined}
                onAction={canEdit ? () => setExpenseModalOpen(true) : undefined}
              />
            ) : (
              <div className="divide-y divide-ivory-200 border border-ivory-200 rounded-2xl overflow-hidden">
                {filteredExpenses.map((exp) => {
                  const catConfig = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
                  const canModify =
                    canEdit &&
                    (exp.createdBy?._id === currentUser?._id ||
                      trip.owner?._id === currentUser?._id ||
                      trip.owner === currentUser?._id);

                  return (
                    <div
                      key={exp._id}
                      className="p-4 bg-white hover:bg-ivory-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 border ${catConfig.color}`}
                        >
                          {catConfig.label}
                        </span>

                        <div className="min-w-0 space-y-1">
                          <h4 className="font-bold text-charcoal-900 text-sm font-display truncate">
                            {exp.title}
                          </h4>
                          <p className="text-charcoal-500 text-[11px]">
                            Paid by <strong className="text-charcoal-800">{exp.paidBy?.name}</strong> •{' '}
                            {new Date(exp.date).toLocaleDateString()} • Split between {exp.splits?.length || 0} travelers ({exp.splitType})
                          </p>
                          {exp.notes && (
                            <p className="text-[11px] text-charcoal-500 italic max-w-lg truncate">
                              "{exp.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-center">
                        {exp.receiptUrl && (
                          <a
                            href={exp.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-forest-700 hover:text-forest-900 font-semibold flex items-center gap-1 underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Receipt
                          </a>
                        )}

                        <span className="font-mono font-bold text-base text-charcoal-900">
                          {formatCurrency(exp.amount / 100)}
                        </span>

                        {canModify && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpense(exp);
                                setExpenseModalOpen(true);
                              }}
                              className="p-1 rounded-lg text-charcoal-400 hover:text-forest-700 hover:bg-forest-50 transition-colors"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteExpenseItem(exp)}
                              className="p-1 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Settlement History & Online Transactions */}
        {activeSubTab === 'settlements' && (
          <div className="space-y-4 pt-2">
            {/* View Mode Switcher: Settlements vs Razorpay Transactions */}
            <div className="flex items-center gap-2 border-b border-ivory-200 pb-2">
              <button
                type="button"
                onClick={() => setSettlementsViewMode('settlements')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  settlementsViewMode === 'settlements'
                    ? 'bg-forest-600 text-white shadow-soft-sm'
                    : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-100'
                }`}
              >
                Settlements ({settlements.length})
              </button>
              <button
                type="button"
                onClick={() => setSettlementsViewMode('payments')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  settlementsViewMode === 'payments'
                    ? 'bg-forest-600 text-white shadow-soft-sm'
                    : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Online Payments ({payments.length})</span>
              </button>
            </div>

            {settlementsViewMode === 'settlements' ? (
              settlements.length === 0 ? (
                <EmptyState
                  icon={Handshake}
                  title="No Settlements Recorded"
                  description="When companions reimburse each other with cash, UPI, Venmo, or Razorpay, record it here to update balances."
                  actionLabel={canEdit ? 'Record First Settlement' : undefined}
                  onAction={canEdit ? () => setSettlementModalOpen(true) : undefined}
                />
              ) : (
                <div className="divide-y divide-ivory-200 border border-ivory-200 rounded-2xl overflow-hidden">
                  {settlements.map((set) => {
                    const canModify =
                      canEdit &&
                      (set.recordedBy?._id === currentUser?._id ||
                        trip.owner?._id === currentUser?._id ||
                        trip.owner === currentUser?._id);

                    const isPending = set.status === 'pending';
                    const isFailed = set.status === 'failed';
                    const isRefunded = set.status === 'refunded';
                    const isPayer = String(set.payer?._id || set.payer) === String(currentUser?._id);

                    return (
                      <div
                        key={set._id}
                        className="p-4 bg-white hover:bg-ivory-50/60 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-terracotta-50 text-terracotta-700 border border-terracotta-200 flex items-center justify-center shrink-0">
                            <Handshake className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-charcoal-900 text-xs flex items-center gap-1.5 truncate">
                                <span>{set.payer?.name}</span>
                                <ArrowRight className="w-3 h-3 text-charcoal-400 shrink-0" />
                                <span>{set.payee?.name}</span>
                              </p>
                              {isPending && <Badge variant="warning" size="sm">Pending Payment</Badge>}
                              {isFailed && <Badge variant="error" size="sm">Failed</Badge>}
                              {isRefunded && <Badge variant="neutral" size="sm">Refunded</Badge>}
                              {(!set.status || set.status === 'completed') && (
                                <Badge variant="success" size="sm">Completed</Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-charcoal-400 mt-0.5">
                              {new Date(set.date).toLocaleDateString()} • Method: <span className="capitalize">{set.paymentMethod}</span>
                              {set.notes && ` • "${set.notes}"`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-mono font-bold text-sm ${isPending ? 'text-charcoal-600' : 'text-emerald-700'}`}>
                            {formatCurrency(set.amount / 100)}
                          </span>

                          {isPending && isPayer && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSettlementPrefill({
                                  settlementId: set._id,
                                  fromUser: set.payer,
                                  toUser: set.payee,
                                  amountMinor: set.amount,
                                  forceRazorpay: true,
                                });
                                setSettlementModalOpen(true);
                              }}
                              className="text-[11px] h-7 px-2.5"
                            >
                              Pay Now
                            </Button>
                          )}

                          {canModify && (
                            <button
                              type="button"
                              onClick={() => setDeleteSettlementItem(set)}
                              className="p-1 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Settlement (Reverses Balance)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Online Payments Transaction History */
              payments.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No Online Transactions Yet"
                  description="When members initiate online payments via Razorpay test mode, transaction orders, signatures, and timestamps will be logged here."
                />
              ) : (
                <div className="divide-y divide-ivory-200 border border-ivory-200 rounded-2xl overflow-hidden text-xs">
                  {payments.map((p) => {
                    const isPaid = p.status === 'paid';
                    const isFailed = p.status === 'failed';
                    const isRefunded = p.status === 'refunded';

                    return (
                      <div key={p._id} className="p-4 bg-white hover:bg-ivory-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-charcoal-900">
                              {p.payer?.name} &rarr; {p.payee?.name}
                            </span>
                            <Badge variant={isPaid ? 'success' : isFailed ? 'error' : isRefunded ? 'neutral' : 'warning'} size="sm">
                              {p.status?.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-charcoal-500 font-mono">
                            Order: {p.razorpayOrderId} {p.razorpayPaymentId ? `• Payment: ${p.razorpayPaymentId}` : ''}
                          </p>
                          {p.failureReason && (
                            <p className="text-[11px] text-rose-500 font-medium">
                              Error: {p.failureReason}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold text-sm text-charcoal-900">
                            {formatCurrency(p.amount / 100)}
                          </p>
                          <span className="text-[10px] text-charcoal-400">
                            {new Date(p.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

      </div>

      {/* Expense Modal (Create & Edit) */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        trip={trip}
        members={members}
        expense={editingExpense}
        currentUserId={currentUser?._id}
        onSaved={loadData}
      />

      {/* Settlement Modal (Record Settlement) */}
      <SettlementModal
        isOpen={settlementModalOpen}
        onClose={() => {
          setSettlementModalOpen(false);
          setSettlementPrefill(null);
        }}
        trip={trip}
        members={members}
        prefill={settlementPrefill}
        onSaved={loadData}
      />

      {/* Delete Expense Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteExpenseItem)}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deleteExpenseItem?.title}"? This will recalculate member net balances.`}
        confirmLabel="Delete Expense"
        cancelLabel="Keep Expense"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteExpenseConfirm}
        onCancel={() => setDeleteExpenseItem(null)}
      />

      {/* Delete Settlement Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteSettlementItem)}
        title="Remove Settlement"
        message="Are you sure you want to remove this settlement? The debt will be reinstated in companion balances."
        confirmLabel="Remove Settlement"
        cancelLabel="Keep Settlement"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteSettlementConfirm}
        onCancel={() => setDeleteSettlementItem(null)}
      />

    </div>
  );
}

export default ExpenseManager;

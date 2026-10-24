import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import {
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Users,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import tripService from '../../services/tripService';
import { formatCurrency, cn } from '../../lib/utils';
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Dialog from '../ui/Dialog';
import Input from '../ui/Input';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../../context/ToastContext';

export function BudgetAnalytics({ trip, members = [], canEdit = false }) {
  const { toast } = useToast();
  const currency = trip?.currency || 'INR';

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Threshold alert settings modal
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(trip?.budgetAlertThreshold || 80);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Receipt preview modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);

  // Expense History Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Fetch Authoritative Analytics Data from Backend
  const loadAnalytics = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await tripService.getTripAnalytics(trip._id);
      if (res.success) {
        setAnalyticsData(res);
        if (res.alertStatus?.threshold) {
          setThresholdInput(res.alertStatus.threshold);
        }
      } else {
        setError('Could not retrieve analytics data.');
      }
    } catch (err) {
      console.error('Failed to load trip budget analytics:', err);
      setError(err.message || 'Failed to fetch budget analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (trip?._id) {
      loadAnalytics();
    }
  }, [trip?._id]);

  // Handle Threshold Update
  const handleSaveThreshold = async (e) => {
    e?.preventDefault();
    const thresholdNum = Number(thresholdInput);
    if (isNaN(thresholdNum) || thresholdNum < 10 || thresholdNum > 200) {
      toast.warning('Invalid Limit', 'Threshold must be between 10% and 200%.');
      return;
    }

    setSavingThreshold(true);
    try {
      const res = await tripService.updateBudgetAlertThreshold(trip._id, thresholdNum);
      if (res.success) {
        toast.success('Alert Limit Updated', `Budget warning alert set to ${thresholdNum}%`);
        setThresholdModalOpen(false);
        // Refresh analytics to re-evaluate threshold alert status
        await loadAnalytics(true);
      }
    } catch (err) {
      toast.error('Update Failed', err.message || 'Could not update threshold.');
    } finally {
      setSavingThreshold(false);
    }
  };

  // Filtered Expense History
  const filteredExpenses = useMemo(() => {
    if (!analyticsData?.expenseHistory) return [];
    return analyticsData.expenseHistory.filter((expense) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        expense.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.paidBy?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        selectedCategory === 'all' || expense.category === selectedCategory;

      // Date range filter
      let matchesDate = true;
      if (startDateFilter) {
        matchesDate = matchesDate && new Date(expense.date) >= new Date(startDateFilter);
      }
      if (endDateFilter) {
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(expense.date) <= end;
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [analyticsData, searchQuery, selectedCategory, startDateFilter, endDateFilter]);

  // Safe KPI destructuring
  const kpis = analyticsData?.kpis || {
    totalBudget: Number(trip?.budget) || 0,
    totalSpent: 0,
    remainingBudget: Number(trip?.budget) || 0,
    percentageUsed: 0,
    totalPlannedCost: 0,
    hasBudget: (Number(trip?.budget) || 0) > 0,
    isOverBudget: false,
  };

  const alertStatus = analyticsData?.alertStatus || {
    level: 'normal',
    threshold: trip?.budgetAlertThreshold || 80,
    isThresholdExceeded: false,
    isOverBudget: false,
    message: '',
  };

  const categorySpending = analyticsData?.categorySpending || [];
  const plannedVsActual = analyticsData?.plannedVsActual || [];
  const dailySpendingTrend = analyticsData?.dailySpendingTrend || [];
  const memberContributions = analyticsData?.memberContributions || [];

  // Custom Recharts Tooltip for Category Donut
  const CategoryTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl border border-ivory-300 shadow-soft-lg text-xs space-y-1">
          <p className="font-semibold text-charcoal-900 flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            {data.label}
          </p>
          <p className="text-charcoal-600 font-mono font-medium">
            {formatCurrency(data.totalSpent, currency)}
          </p>
          <p className="text-charcoal-400">
            {data.percentage}% of total spent ({data.count} expense{data.count !== 1 ? 's' : ''})
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Tooltip for Planned vs Actual
  const ComparisonTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const variance = data.planned - data.actual;
      const isOver = variance < 0;
      return (
        <div className="bg-white p-3 rounded-xl border border-ivory-300 shadow-soft-lg text-xs space-y-1.5">
          <p className="font-semibold text-charcoal-900">{data.name}</p>
          <div className="flex justify-between gap-4 text-charcoal-600">
            <span>Planned Itinerary:</span>
            <span className="font-mono font-medium">{formatCurrency(data.planned, currency)}</span>
          </div>
          <div className="flex justify-between gap-4 text-charcoal-900 font-medium">
            <span>Actual Spend:</span>
            <span className="font-mono">{formatCurrency(data.actual, currency)}</span>
          </div>
          <div className="pt-1 border-t border-ivory-200 flex justify-between gap-4">
            <span>Variance:</span>
            <span
              className={cn(
                'font-mono font-bold',
                isOver ? 'text-rose-600' : 'text-emerald-600'
              )}
            >
              {isOver ? '-' : '+'}
              {formatCurrency(Math.abs(variance), currency)}
              {isOver ? ' (Over)' : ' (Saved)'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Tooltip for Daily Spending Trend
  const DailyTrendTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl border border-ivory-300 shadow-soft-lg text-xs space-y-1">
          <p className="font-semibold text-charcoal-900">{data.date}</p>
          <p className="text-forest-700 font-mono">
            Daily Spent: <span className="font-bold">{formatCurrency(data.dailySpent, currency)}</span>
          </p>
          <p className="text-charcoal-500 font-mono">
            Cumulative to Date: <span className="font-bold">{formatCurrency(data.cumulativeSpent, currency)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Loading skeleton state
  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading budget analytics">
        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40" />
            </Card>
          ))}
        </div>
        {/* Chart Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </Card>
          <Card className="p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </Card>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <Card variant="subtle" className="p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-charcoal-900">Failed to Load Budget Analytics</h3>
        <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mx-auto">{error}</p>
        <Button variant="outline" size="sm" onClick={() => loadAnalytics(false)} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Alert Settings Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-ivory-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-charcoal-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-forest-700" />
            Budget & Financial Analytics
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500 mt-0.5">
            Real-time authoritative expense breakdown, planned comparisons, and member contributions for{' '}
            <span className="font-semibold text-charcoal-700">{trip.title}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setThresholdModalOpen(true)}
              leftIcon={<Sliders className="w-3.5 h-3.5 text-forest-600" />}
              className="text-xs font-medium"
            >
              Alert Limit: {alertStatus.threshold}%
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            aria-label="Refresh analytics data"
            className="text-charcoal-600 hover:text-charcoal-900"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin text-forest-600')} />
          </Button>
        </div>
      </div>

      {/* Threshold Alert Notification Banner */}
      {kpis.hasBudget && alertStatus.isThresholdExceeded && (
        <div
          role="alert"
          className={cn(
            'p-4 rounded-2xl flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm border transition-all',
            alertStatus.isOverBudget
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          )}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle
              className={cn(
                'w-5 h-5 shrink-0',
                alertStatus.isOverBudget ? 'text-rose-600' : 'text-amber-600'
              )}
            />
            <div>
              <span className="font-bold">
                {alertStatus.isOverBudget ? 'Budget Exceeded!' : 'Threshold Alert:'}{' '}
              </span>
              <span>{alertStatus.message}</span>
            </div>
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setThresholdModalOpen(true)}
              className={cn(
                'shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg',
                alertStatus.isOverBudget
                  ? 'hover:bg-rose-100 text-rose-800'
                  : 'hover:bg-amber-100 text-amber-800'
              )}
            >
              Adjust Limit
            </Button>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Budget */}
        <Card variant="default" className="p-5 shadow-soft border border-ivory-200/90 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
              Total Budget
            </span>
            <div className="w-8 h-8 rounded-lg bg-forest-50 text-forest-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-charcoal-900">
              {kpis.hasBudget ? formatCurrency(kpis.totalBudget, currency) : 'No limit set'}
            </span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-1.5 flex items-center gap-1">
            <span>Planned Itinerary:</span>
            <span className="font-mono font-medium text-charcoal-600">
              {formatCurrency(kpis.totalPlannedCost, currency)}
            </span>
          </p>
        </Card>

        {/* KPI 2: Total Spent */}
        <Card variant="default" className="p-5 shadow-soft border border-ivory-200/90 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
              Total Spent
            </span>
            <div className="w-8 h-8 rounded-lg bg-terracotta-50 text-terracotta-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-charcoal-900">
              {formatCurrency(kpis.totalSpent, currency)}
            </span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-1.5">
            From {analyticsData?.expenseHistory?.length || 0} logged expense items
          </p>
        </Card>

        {/* KPI 3: Remaining Budget */}
        <Card
          variant="default"
          className={cn(
            'p-5 shadow-soft border relative overflow-hidden',
            alertStatus.isOverBudget
              ? 'border-rose-200 bg-rose-50/30'
              : 'border-ivory-200/90'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
              {alertStatus.isOverBudget ? 'Over Budget' : 'Remaining Budget'}
            </span>
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                alertStatus.isOverBudget
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              )}
            >
              {alertStatus.isOverBudget ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-2">
            <span
              className={cn(
                'text-2xl font-bold font-mono tracking-tight',
                alertStatus.isOverBudget ? 'text-rose-600' : 'text-emerald-700'
              )}
            >
              {kpis.hasBudget
                ? alertStatus.isOverBudget
                  ? `-${formatCurrency(kpis.overBudget, currency)}`
                  : formatCurrency(kpis.remainingBudget, currency)
                : 'N/A'}
            </span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-1.5">
            {kpis.hasBudget
              ? alertStatus.isOverBudget
                ? `Exceeded limit by ${(kpis.percentageUsed - 100).toFixed(1)}%`
                : `${(100 - kpis.percentageUsed).toFixed(1)}% funds still available`
              : 'Add budget in trip settings'}
          </p>
        </Card>

        {/* KPI 4: Percentage Used */}
        <Card variant="default" className="p-5 shadow-soft border border-ivory-200/90 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
              Budget Used
            </span>
            <Badge
              variant={
                alertStatus.isOverBudget
                  ? 'danger'
                  : alertStatus.isThresholdExceeded
                  ? 'warning'
                  : 'forest'
              }
              size="sm"
            >
              {alertStatus.isOverBudget
                ? 'Over Limit'
                : alertStatus.isThresholdExceeded
                ? 'Near Cap'
                : 'On Track'}
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-charcoal-900">
              {kpis.percentageUsed}%
            </span>
            {kpis.hasBudget && (
              <span className="text-xs text-charcoal-400 font-medium">
                / {alertStatus.threshold}% alert
              </span>
            )}
          </div>
          {/* Progress Bar */}
          <div className="mt-2.5 h-1.5 w-full bg-ivory-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                alertStatus.isOverBudget
                  ? 'bg-rose-500'
                  : alertStatus.isThresholdExceeded
                  ? 'bg-amber-500'
                  : 'bg-forest-600'
              )}
              style={{ width: `${Math.min(100, kpis.percentageUsed)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Charts Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Category-wise Spending Donut */}
        <Card variant="default" className="shadow-soft border border-ivory-200">
          <CardHeader className="border-b border-ivory-200 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-terracotta-600" />
                Category Spending Breakdown
              </CardTitle>
              <CardDescription>
                Proportion of funds allocated per expense category
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-semibold text-charcoal-600 bg-ivory-100 px-2.5 py-1 rounded-lg">
              {categorySpending.length} Categories
            </span>
          </CardHeader>
          <CardContent className="p-6">
            {categorySpending.length === 0 ? (
              <EmptyState
                icon={PieIcon}
                title="No Category Data"
                description="Log your trip expenses to see a visual category distribution."
                className="py-12"
              />
            ) : (
              <div className="space-y-6">
                <div
                  className="h-64 relative flex items-center justify-center"
                  role="region"
                  aria-label="Category spending donut chart"
                >
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                    <PieChart>
                      <Pie
                        data={categorySpending}
                        dataKey="totalSpent"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {categorySpending.map((entry, idx) => (
                          <Cell
                            key={`donut-cell-${idx}`}
                            fill={entry.color}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Donut Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-medium text-charcoal-400 uppercase tracking-wider">
                      Total Spent
                    </span>
                    <span className="text-lg font-bold font-mono text-charcoal-900">
                      {formatCurrency(kpis.totalSpent, currency)}
                    </span>
                  </div>
                </div>

                {/* Accessible Screen-reader summary */}
                <p className="sr-only">
                  Category spending breakdown:{' '}
                  {categorySpending
                    .map((c) => `${c.label}: ${c.totalSpent} ${currency} (${c.percentage}%)`)
                    .join(', ')}
                </p>

                {/* Legend Chips with Amounts */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-ivory-200">
                  {categorySpending.map((cat) => (
                    <div
                      key={cat.category}
                      className="p-2 rounded-xl bg-ivory-50 border border-ivory-200/80 flex flex-col"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-[11px] font-medium text-charcoal-700 truncate">
                          {cat.label}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-mono font-bold text-charcoal-900">
                          {formatCurrency(cat.totalSpent, currency)}
                        </span>
                        <span className="text-[10px] text-charcoal-400 font-medium">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Planned vs. Actual Spending Chart */}
        <Card variant="default" className="shadow-soft border border-ivory-200">
          <CardHeader className="border-b border-ivory-200 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-forest-700" />
                Planned vs. Actual Spending
              </CardTitle>
              <CardDescription>
                Compare planned itinerary estimates against actual logged bills
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-charcoal-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" />
                Planned
              </span>
              <span className="flex items-center gap-1 text-charcoal-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-forest-700 inline-block" />
                Actual
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {plannedVsActual.every((p) => p.planned === 0 && p.actual === 0) ? (
              <EmptyState
                icon={BarChart3}
                title="No Comparison Data"
                description="Add estimated costs in your itinerary schedule and log expenses to compare variances."
                className="py-12"
              />
            ) : (
              <div
                className="h-80"
                role="region"
                aria-label="Planned versus actual spending bar chart"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                  <BarChart
                    data={plannedVsActual}
                    margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE3D6" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      axisLine={{ stroke: '#EAE3D6' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      axisLine={{ stroke: '#EAE3D6' }}
                      tickLine={false}
                      tickFormatter={(val) => `${val}`}
                    />
                    <Tooltip content={<ComparisonTooltip />} />
                    <Bar
                      dataKey="planned"
                      name="Planned"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    <Bar
                      dataKey="actual"
                      name="Actual"
                      fill="#1B4332"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart 3: Daily Spending Trend Area Chart */}
      <Card variant="default" className="shadow-soft border border-ivory-200">
        <CardHeader className="border-b border-ivory-200 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-forest-700" />
              Daily Spending Trend & Trajectory
            </CardTitle>
            <CardDescription>
              Chronological daily spending spikes and cumulative group spend
            </CardDescription>
          </div>
          {kpis.hasBudget && (
            <span className="text-xs font-mono font-medium text-charcoal-500 self-start sm:self-auto bg-ivory-100 px-2.5 py-1 rounded-lg">
              Target Budget: {formatCurrency(kpis.totalBudget, currency)}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {dailySpendingTrend.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No Timeline Data"
              description="Daily spending trend will chart your expenses chronologically as you log them."
              className="py-10"
            />
          ) : (
            <div
              className="h-72"
              role="region"
              aria-label="Daily spending trend area chart"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                <AreaChart
                  data={dailySpendingTrend}
                  margin={{ top: 15, right: 15, left: 0, bottom: 15 }}
                >
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B4332" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#1B4332" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E07A5F" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#E07A5F" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE3D6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={{ stroke: '#EAE3D6' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={{ stroke: '#EAE3D6' }}
                    tickLine={false}
                    tickFormatter={(val) => `${val}`}
                  />
                  <Tooltip content={<DailyTrendTooltip />} />
                  {kpis.hasBudget && (
                    <ReferenceLine
                      y={kpis.totalBudget}
                      stroke="#E07A5F"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Budget Cap',
                        fill: '#E07A5F',
                        fontSize: 10,
                        position: 'top',
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="dailySpent"
                    name="Daily Spend"
                    stroke="#1B4332"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSpent)"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeSpent"
                    name="Cumulative Spend"
                    stroke="#E07A5F"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCumulative)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Individual Member Contribution Summary */}
      <Card variant="default" className="shadow-soft border border-ivory-200">
        <CardHeader className="border-b border-ivory-200 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Users className="w-4 h-4 text-forest-700" />
              Member Contribution Summary
            </CardTitle>
            <CardDescription>
              Total payments, fair shares, and net balance status across companions
            </CardDescription>
          </div>
          <span className="text-xs text-charcoal-500 font-mono">
            {memberContributions.length} Travelers
          </span>
        </CardHeader>
        <CardContent className="p-6">
          {memberContributions.length === 0 ? (
            <p className="text-xs text-charcoal-400 text-center py-6">
              No traveler financial records yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberContributions.map((member) => {
                const isCreditor = member.netBalance > 0;
                const isDebtor = member.netBalance < 0;
                const initials = member.name
                  ? member.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'T';

                return (
                  <div
                    key={member.userId}
                    className="p-4 rounded-xl border border-ivory-200 bg-white hover:border-ivory-300 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-9 h-9 rounded-full object-cover border border-ivory-300"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-forest-100 text-forest-800 font-bold text-xs flex items-center justify-center border border-forest-200">
                            {initials}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-semibold text-charcoal-900 leading-tight">
                            {member.name}
                          </h4>
                          <p className="text-[10px] text-charcoal-400 truncate max-w-[140px]">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={isCreditor ? 'success' : isDebtor ? 'danger' : 'neutral'}
                        size="sm"
                      >
                        {isCreditor ? 'To Receive' : isDebtor ? 'Owes Money' : 'Settled'}
                      </Badge>
                    </div>

                    {/* Financial Figures */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-ivory-100 text-center">
                      <div className="p-1.5 rounded-lg bg-ivory-50">
                        <span className="text-[10px] text-charcoal-400 block">Paid</span>
                        <span className="text-xs font-mono font-bold text-charcoal-900">
                          {formatCurrency(member.totalPaid, currency)}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-ivory-50">
                        <span className="text-[10px] text-charcoal-400 block">Share</span>
                        <span className="text-xs font-mono font-medium text-charcoal-700">
                          {formatCurrency(member.totalShare, currency)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'p-1.5 rounded-lg',
                          isCreditor
                            ? 'bg-emerald-50 text-emerald-800'
                            : isDebtor
                            ? 'bg-rose-50 text-rose-800'
                            : 'bg-ivory-50 text-charcoal-600'
                        )}
                      >
                        <span className="text-[10px] block opacity-80">Net</span>
                        <span className="text-xs font-mono font-bold">
                          {isCreditor ? '+' : ''}
                          {formatCurrency(member.netBalance, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Contribution Progress */}
                    <div>
                      <div className="flex justify-between text-[11px] text-charcoal-500 mb-1">
                        <span>Paid Contribution:</span>
                        <span className="font-mono font-semibold">
                          {member.percentageContributed}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-ivory-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-forest-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, member.percentageContributed)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Filterable Expense History */}
      <Card variant="default" className="shadow-soft border border-ivory-200">
        <CardHeader className="border-b border-ivory-200 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Receipt className="w-4 h-4 text-forest-700" />
              Expense History & Filter
            </CardTitle>
            <CardDescription>
              Review all authenticated expense entries with date, category, and payer filters
            </CardDescription>
          </div>

          <div className="text-xs text-charcoal-500 font-mono">
            Showing {filteredExpenses.length} of {analyticsData?.expenseHistory?.length || 0} entries
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-ivory-50/70 p-3.5 rounded-xl border border-ivory-200">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description or payer..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-ivory-300 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-charcoal-900"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-ivory-300 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-charcoal-900"
              >
                <option value="all">All Categories</option>
                <option value="lodging">Lodging & Stays</option>
                <option value="dining">Dining & Food</option>
                <option value="transport">Transit & Travel</option>
                <option value="activity">Activities & Sights</option>
                <option value="groceries">Groceries & Supplies</option>
                <option value="entertainment">Entertainment</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-ivory-300 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-charcoal-900"
                placeholder="From Date"
              />
            </div>

            {/* End Date */}
            <div className="flex gap-2">
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-ivory-300 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-charcoal-900"
                placeholder="To Date"
              />
              {(searchQuery || selectedCategory !== 'all' || startDateFilter || endDateFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setStartDateFilter('');
                    setEndDateFilter('');
                  }}
                  className="px-2 text-xs text-charcoal-500 hover:text-charcoal-900 shrink-0"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Table / List */}
          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center text-charcoal-400 space-y-2">
              <Receipt className="w-8 h-8 mx-auto opacity-40 text-charcoal-400" />
              <p className="text-xs">No expenses match the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ivory-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-ivory-100/70 border-b border-ivory-200 text-charcoal-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Paid By</th>
                    <th className="py-2.5 px-4">Split</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-100 bg-white">
                  {filteredExpenses.map((expense) => {
                    const isRefund = expense.type === 'refund';
                    return (
                      <tr key={expense._id} className="hover:bg-ivory-50/60 transition-colors">
                        <td className="py-3 px-4 text-charcoal-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(expense.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-charcoal-900">
                          <div className="flex items-center gap-2">
                            <span>{expense.title}</span>
                            {expense.receiptUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewReceiptUrl(expense.receiptUrl)}
                                className="text-forest-600 hover:text-forest-800 p-0.5 rounded"
                                title="View attached receipt"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {expense.notes && (
                            <p className="text-[11px] text-charcoal-400 truncate max-w-xs mt-0.5">
                              {expense.notes}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant="neutral" size="sm">
                            {expense.categoryLabel}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-charcoal-700">
                          {expense.paidBy?.name || 'Traveler'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap capitalize text-charcoal-500">
                          {expense.splitType}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold">
                          <span
                            className={cn(
                              isRefund ? 'text-emerald-600' : 'text-charcoal-900'
                            )}
                          >
                            {isRefund ? '-' : ''}
                            {formatCurrency(expense.amountMajor, currency)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threshold Configuration Dialog */}
      <Dialog
        isOpen={thresholdModalOpen}
        onClose={() => setThresholdModalOpen(false)}
        title="Configure Budget Alert Threshold"
        description="Set the budget usage percentage at which companions receive visual warning alerts on the dashboard."
      >
        <form onSubmit={handleSaveThreshold} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-800 uppercase tracking-wider mb-2">
              Alert Trigger Percentage (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="10"
                max="200"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(Number(e.target.value))}
                className="w-24 px-3 py-2 text-sm font-mono font-bold rounded-xl border border-ivory-300 focus:outline-none focus:ring-2 focus:ring-forest-600 text-charcoal-900"
              />
              <span className="text-sm font-medium text-charcoal-600">% of group budget</span>
            </div>
            <p className="text-xs text-charcoal-400 mt-1.5">
              Current budget: {formatCurrency(kpis.totalBudget, currency)}. Alert will fire at{' '}
              <span className="font-mono font-semibold text-charcoal-700">
                {formatCurrency((kpis.totalBudget * Number(thresholdInput)) / 100, currency)}
              </span>
              .
            </p>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
              Common Presets:
            </span>
            <div className="flex gap-2">
              {[50, 75, 80, 90, 100].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setThresholdInput(preset)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-lg font-mono font-semibold transition-all border',
                    thresholdInput === preset
                      ? 'bg-forest-900 text-white border-forest-900'
                      : 'bg-ivory-50 text-charcoal-700 border-ivory-300 hover:border-forest-600'
                  )}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-ivory-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setThresholdModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={savingThreshold}
            >
              Save Alert Limit
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Receipt Preview Dialog */}
      <Dialog
        isOpen={Boolean(previewReceiptUrl)}
        onClose={() => setPreviewReceiptUrl(null)}
        title="Expense Receipt Document"
      >
        <div className="space-y-4">
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-ivory-300 flex items-center justify-center bg-ivory-50 p-2">
            <img
              src={previewReceiptUrl}
              alt="Receipt Preview"
              className="max-w-full max-h-[60vh] object-contain rounded-lg"
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewReceiptUrl(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default BudgetAnalytics;

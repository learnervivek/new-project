import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Filter,
  Search,
  Users,
  CheckCircle2,
  Trash2,
  Edit2,
  RefreshCw,
  ShoppingBag,
  Luggage,
  Sparkles,
  FileText,
  ShieldAlert,
  HeartPulse,
  Smartphone,
  Shirt,
  Sparkle,
} from 'lucide-react';
import tripService from '../../services/tripService';
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Dialog from '../ui/Dialog';
import ConfirmDialog from '../ui/ConfirmDialog';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';

const categoryMeta = {
  clothing: { label: 'Clothing & Apparel', icon: Shirt, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  documents: { label: 'Documents & Passes', icon: FileText, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  medicines: { label: 'Health & Medicines', icon: HeartPulse, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  electronics: { label: 'Electronics & Gear', icon: Smartphone, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  essentials: { label: 'Travel Essentials', icon: Luggage, color: 'text-forest-600 bg-forest-50 border-forest-200' },
  toiletries: { label: 'Toiletries & Hygiene', icon: Sparkles, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  other: { label: 'Miscellaneous', icon: ShoppingBag, color: 'text-charcoal-600 bg-ivory-100 border-ivory-300' },
};

export function PackingChecklist({ trip, members = [], canEdit = false }) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    packedItems: 0,
    unpackedItems: 0,
    progressPercentage: 0,
    categoryStats: {},
  });

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Item Modal state (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'essentials',
    quantity: 1,
    assignedTo: '',
    notes: '',
  });

  // Delete Dialog state
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Normalized list of trip travelers (owner + accepted members)
  const companionList = useMemo(() => {
    const list = [];
    if (trip?.owner) {
      list.push({
        _id: String(trip.owner._id || trip.owner),
        name: trip.owner.name || 'Organizer (You)',
        avatar: trip.owner.avatar || '',
      });
    }
    (members || []).forEach((m) => {
      const u = m.user || m;
      const uid = String(u._id || u.id || u);
      if (!list.some((existing) => existing._id === uid)) {
        list.push({
          _id: uid,
          name: u.name || 'Traveler',
          avatar: u.avatar || '',
        });
      }
    });
    return list;
  }, [trip?.owner, members]);

  // Load items from backend
  const loadChecklist = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await tripService.getPackingItems(trip._id);
      if (res.success) {
        setItems(res.items || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load packing items:', err);
      toast.error('Load Error', err.message || 'Could not load packing checklist.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (trip?._id) {
      loadChecklist();
    }
  }, [trip?._id]);

  // Toggle item packed status
  const handleTogglePacked = async (item) => {
    // Optimistic UI update
    const prevItems = [...items];
    const prevStats = { ...stats };

    const nextIsPacked = !item.isPacked;
    const updatedItems = items.map((i) =>
      i._id === item._id ? { ...i, isPacked: nextIsPacked } : i
    );
    setItems(updatedItems);

    const newPackedCount = stats.packedItems + (nextIsPacked ? 1 : -1);
    const newProgress = stats.totalItems > 0 ? Math.round((newPackedCount / stats.totalItems) * 100) : 0;
    setStats({
      ...stats,
      packedItems: newPackedCount,
      unpackedItems: stats.totalItems - newPackedCount,
      progressPercentage: newProgress,
    });

    try {
      const res = await tripService.togglePackingItem(trip._id, item._id);
      if (res.success) {
        // Confirm server stats
        if (res.stats) {
          setStats((prev) => ({
            ...prev,
            packedItems: res.stats.packedItems,
            progressPercentage: res.stats.progressPercentage,
          }));
        }
      } else {
        // Rollback
        setItems(prevItems);
        setStats(prevStats);
      }
    } catch (err) {
      setItems(prevItems);
      setStats(prevStats);
      toast.error('Action Failed', err.message || 'Could not update item state.');
    }
  };

  // Open Create Modal
  const openCreateModal = (defaultCategory = 'essentials') => {
    setEditingItem(null);
    setFormData({
      title: '',
      category: defaultCategory,
      quantity: 1,
      assignedTo: '',
      notes: '',
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category || 'essentials',
      quantity: item.quantity || 1,
      assignedTo: item.assignedTo?._id || item.assignedTo || '',
      notes: item.notes || '',
    });
    setModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.warning('Title Required', 'Please enter a name for the item.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        quantity: Number(formData.quantity) || 1,
        assignedTo: formData.assignedTo || null,
        notes: formData.notes.trim(),
      };

      if (editingItem) {
        const res = await tripService.updatePackingItem(trip._id, editingItem._id, payload);
        if (res.success) {
          toast.success('Item Updated', `"${payload.title}" has been updated.`);
          setModalOpen(false);
          await loadChecklist(true);
        }
      } else {
        const res = await tripService.createPackingItem(trip._id, payload);
        if (res.success) {
          toast.success('Item Added', `"${payload.title}" added to your packing checklist.`);
          setModalOpen(false);
          await loadChecklist(true);
        }
      }
    } catch (err) {
      toast.error('Save Failed', err.message || 'Could not save checklist item.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete item
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmItem) return;
    setDeleting(true);
    try {
      const res = await tripService.deletePackingItem(trip._id, deleteConfirmItem._id);
      if (res.success) {
        toast.info('Item Removed', `"${deleteConfirmItem.title}" removed from packing list.`);
        setDeleteConfirmItem(null);
        await loadChecklist(true);
      }
    } catch (err) {
      toast.error('Delete Failed', err.message || 'Could not delete item.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter items in memory
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus === 'packed' && !item.isPacked) return false;
      if (selectedStatus === 'unpacked' && item.isPacked) return false;

      // Member filter
      if (selectedMember === 'unassigned' && item.assignedTo) return false;
      if (
        selectedMember !== 'all' &&
        selectedMember !== 'unassigned' &&
        (item.assignedTo?._id || item.assignedTo) !== selectedMember
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);
        const matchesPayer = item.assignedTo?.name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesPayer) return false;
      }

      return true;
    });
  }, [items, selectedCategory, selectedStatus, selectedMember, searchQuery]);

  // Group items by category for structured layout
  const groupedItems = useMemo(() => {
    const groups = {};
    const catKeys = ['clothing', 'documents', 'medicines', 'electronics', 'essentials', 'toiletries', 'other'];
    catKeys.forEach((k) => {
      groups[k] = [];
    });

    filteredItems.forEach((item) => {
      const k = item.category || 'other';
      if (!groups[k]) groups[k] = [];
      groups[k].push(item);
    });

    return groups;
  }, [filteredItems]);

  // Active categories that have items matching the filters
  const populatedCategories = useMemo(() => {
    const catKeys = ['clothing', 'documents', 'medicines', 'electronics', 'essentials', 'toiletries', 'other'];
    if (selectedCategory !== 'all') {
      return [selectedCategory];
    }
    return catKeys.filter((k) => groupedItems[k] && groupedItems[k].length > 0);
  }, [groupedItems, selectedCategory]);

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading packing checklist">
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full rounded-full" />
        </Card>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="w-5 h-5 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card: Progress Overview */}
      <Card variant="default" className="shadow-soft border border-ivory-200">
        <CardHeader className="border-b border-ivory-200/80 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Luggage className="w-5 h-5 text-forest-700" />
              <CardTitle className="text-lg font-display">Packing Checklist</CardTitle>
            </div>
            <CardDescription>
              Collaborative travel packing list with member assignments and category tracking.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadChecklist(true)}
              disabled={refreshing}
              aria-label="Refresh checklist"
              className="text-charcoal-600 hover:text-charcoal-900"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin text-forest-600')} />
            </Button>

            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openCreateModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            {/* Progress Bar & Percentage */}
            <div className="md:col-span-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider">
                  Overall Packing Progress
                </span>
                <span className="text-sm font-mono font-bold text-forest-800">
                  {stats.packedItems} of {stats.totalItems} items packed ({stats.progressPercentage}%)
                </span>
              </div>

              <div className="h-3 w-full bg-ivory-200 rounded-full overflow-hidden p-0.5 border border-ivory-300/60">
                <div
                  className="h-full bg-forest-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, stats.progressPercentage)}%` }}
                />
              </div>

              <div className="flex items-center gap-4 text-[11px] text-charcoal-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-forest-600 inline-block" />
                  {stats.packedItems} Packed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  {stats.unpackedItems} Still to Pack
                </span>
              </div>
            </div>

            {/* Quick Completion Badge */}
            <div className="bg-ivory-50 rounded-xl p-4 border border-ivory-200 text-center flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-mono text-forest-900">
                {stats.progressPercentage}%
              </span>
              <span className="text-[11px] text-charcoal-500 font-medium mt-0.5">
                {stats.progressPercentage === 100
                  ? 'All Set & Ready to Go!'
                  : stats.progressPercentage > 50
                  ? 'Great progress!'
                  : 'Packing underway'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <Card variant="subtle" className="p-4 border border-ivory-200/90 shadow-soft-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items or travelers..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-ivory-300 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-charcoal-900 placeholder:text-charcoal-400"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-ivory-300 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-charcoal-900 font-medium"
            >
              <option value="all">All Categories ({stats.totalItems})</option>
              {Object.entries(categoryMeta).map(([k, meta]) => {
                const count = stats.categoryStats?.[k]?.total || 0;
                return (
                  <option key={k} value={k}>
                    {meta.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Member Filter */}
          <div>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-ivory-300 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-charcoal-900 font-medium"
            >
              <option value="all">All Travelers</option>
              <option value="unassigned">Unassigned Items</option>
              {companionList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-ivory-300 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-charcoal-900 font-medium"
            >
              <option value="all">All Status</option>
              <option value="unpacked">Unpacked Only ({stats.unpackedItems})</option>
              <option value="packed">Packed Only ({stats.packedItems})</option>
            </select>

            {(searchQuery || selectedCategory !== 'all' || selectedMember !== 'all' || selectedStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedMember('all');
                  setSelectedStatus('all');
                }}
                className="px-2.5 text-xs text-charcoal-500 hover:text-charcoal-900 shrink-0"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Checklist Items Section */}
      {items.length === 0 ? (
        <EmptyState
          icon={Luggage}
          title="Packing Checklist is Empty"
          description="Prepare for your adventure by creating a shared packing checklist. Group items into clothing, gear, medicines, and documents."
          action={
            canEdit && (
              <Button variant="primary" size="sm" onClick={() => openCreateModal()} leftIcon={<Plus className="w-4 h-4" />}>
                Add First Item
              </Button>
            )
          }
          className="py-16"
        />
      ) : filteredItems.length === 0 ? (
        <Card variant="default" className="p-12 text-center space-y-3">
          <Filter className="w-8 h-8 text-charcoal-300 mx-auto" />
          <h3 className="text-sm font-bold text-charcoal-900">No Matching Items</h3>
          <p className="text-xs text-charcoal-500">
            No packing items matched your current filter criteria.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedMember('all');
              setSelectedStatus('all');
            }}
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {populatedCategories.map((catKey) => {
            const catItems = groupedItems[catKey] || [];
            if (catItems.length === 0) return null;
            const meta = categoryMeta[catKey] || categoryMeta.other;
            const CatIcon = meta.icon;
            const catPacked = catItems.filter((i) => i.isPacked).length;

            return (
              <div key={catKey} className="space-y-2.5">
                {/* Category Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('p-1.5 rounded-lg border', meta.color)}>
                      <CatIcon className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold font-display text-charcoal-900">
                      {meta.label}
                    </h3>
                    <span className="text-[11px] font-mono text-charcoal-400">
                      ({catPacked}/{catItems.length} packed)
                    </span>
                  </div>

                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCreateModal(catKey)}
                      className="text-xs text-forest-700 hover:text-forest-900 gap-1 h-7 px-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to {meta.label.split(' ')[0]}
                    </Button>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {catItems.map((item) => {
                    const isPacked = item.isPacked;
                    const assignedUser = item.assignedTo;

                    return (
                      <div
                        key={item._id}
                        className={cn(
                          'p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 bg-white',
                          isPacked
                            ? 'border-ivory-200 bg-ivory-50/50 opacity-75'
                            : 'border-ivory-300/80 shadow-soft-sm hover:border-ivory-400'
                        )}
                      >
                        {/* Checkbox & Details */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePacked(item)}
                            className={cn(
                              'mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all border shrink-0',
                              isPacked
                                ? 'bg-forest-600 border-forest-600 text-white'
                                : 'bg-white border-ivory-400 hover:border-forest-600 text-transparent'
                            )}
                            aria-label={`Mark "${item.title}" as ${isPacked ? 'unpacked' : 'packed'}`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span
                                className={cn(
                                  'text-sm font-semibold transition-all',
                                  isPacked ? 'line-through text-charcoal-400 font-normal' : 'text-charcoal-900'
                                )}
                              >
                                {item.title}
                              </span>

                              {item.quantity > 1 && (
                                <span className="text-[11px] font-mono font-bold text-forest-700 bg-forest-50 px-1.5 py-0.5 rounded">
                                  ×{item.quantity}
                                </span>
                              )}
                            </div>

                            {item.notes && (
                              <p className="text-xs text-charcoal-500 mt-0.5 leading-relaxed line-clamp-2">
                                {item.notes}
                              </p>
                            )}

                            {isPacked && item.packedBy && (
                              <p className="text-[10px] text-forest-700 font-medium mt-1">
                                Packed by {item.packedBy.name || 'a companion'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Assigned Member & Actions */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {assignedUser ? (
                            <div
                              className="flex items-center gap-1.5 bg-ivory-100/80 px-2 py-1 rounded-lg border border-ivory-200"
                              title={`Assigned to ${assignedUser.name}`}
                            >
                              {assignedUser.avatar ? (
                                <img
                                  src={assignedUser.avatar}
                                  alt={assignedUser.name}
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-forest-200 text-forest-800 text-[9px] font-bold flex items-center justify-center">
                                  {assignedUser.name ? assignedUser.name[0].toUpperCase() : 'T'}
                                </span>
                              )}
                              <span className="text-[11px] font-medium text-charcoal-700 truncate max-w-[100px]">
                                {assignedUser.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-charcoal-400 font-medium italic hidden sm:inline-block">
                              Unassigned
                            </span>
                          )}

                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-100 transition-colors"
                                title="Edit item"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmItem(item)}
                                className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete item"
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
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Checklist Item Modal */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Packing Item' : 'Add Packing Checklist Item'}
        description="Specify the item name, category, quantity, and assign a companion."
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-800 uppercase tracking-wider mb-1.5">
              Item Name *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Hiking boots, Waterproof rain jacket, Passports"
              className="w-full px-3 py-2 text-xs rounded-xl border border-ivory-300 focus:outline-none focus:ring-2 focus:ring-forest-600 text-charcoal-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-800 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-ivory-300 bg-white focus:outline-none focus:ring-2 focus:ring-forest-600 text-charcoal-900"
              >
                {Object.entries(categoryMeta).map(([k, meta]) => (
                  <option key={k} value={k}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-800 uppercase tracking-wider mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-ivory-300 focus:outline-none focus:ring-2 focus:ring-forest-600 text-charcoal-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-800 uppercase tracking-wider mb-1.5">
              Assign to Traveler (Optional)
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-ivory-300 bg-white focus:outline-none focus:ring-2 focus:ring-forest-600 text-charcoal-900"
            >
              <option value="">Unassigned (Anyone can pack)</option>
              {companionList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-800 uppercase tracking-wider mb-1.5">
              Notes & Reminders (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Ensure battery is fully charged, keep in carry-on bag"
              className="w-full px-3 py-2 text-xs rounded-xl border border-ivory-300 focus:outline-none focus:ring-2 focus:ring-forest-600 text-charcoal-900"
            />
          </div>

          <div className="pt-3 border-t border-ivory-200 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={formSubmitting}>
              {editingItem ? 'Save Changes' : 'Add to Checklist'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmItem)}
        onClose={() => setDeleteConfirmItem(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Packing Item"
        message={`Are you sure you want to remove "${deleteConfirmItem?.title}" from the packing list?`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

export default PackingChecklist;

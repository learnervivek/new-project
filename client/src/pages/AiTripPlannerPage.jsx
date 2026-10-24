import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  MapPin,
  Calendar,
  IndianRupee,
  Users,
  Compass,
  ArrowRight,
  RefreshCw,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Info,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Layers,
  PieChart as PieIcon,
  Luggage,
  Sliders,
  Edit2,
  Check,
  X,
  ExternalLink,
  Flame,
  Sun,
  ShieldAlert,
  Car,
  Utensils,
  Hotel,
  Ticket,
  Footprints,
  Coffee,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Dialog from '../components/ui/Dialog';
import { formatINR } from '../utils/currency';
import aiService from '../services/aiService';
import { useToast } from '../context/ToastContext';

// Popular Indian Destination Presets
const POPULAR_DESTINATIONS = [
  'Manali, Himachal Pradesh',
  'Goa (North & South)',
  'Jaipur & Udaipur, Rajasthan',
  'Kerala (Munnar & Alleppey)',
  'Rishikesh & Haridwar, Uttarakhand',
  'Varanasi, Uttar Pradesh',
  'Srinagar & Gulmarg, Kashmir',
  'Leh & Ladakh',
  'Shillong & Cherrapunji, Meghalaya',
  'Ooty & Nilgiris, Tamil Nadu',
  'Andaman & Nicobar Islands',
  'Darjeeling & Gangtok, Sikkim',
];

// Curated Travel Interests
const INTEREST_OPTIONS = [
  { id: 'adventure', label: 'Adventure & Trekking', icon: '🏔️' },
  { id: 'nature', label: 'Nature & Wildlife', icon: '🌿' },
  { id: 'beaches', label: 'Beaches & Coastal', icon: '🏖️' },
  { id: 'food', label: 'Food & Culinary', icon: '🍛' },
  { id: 'culture', label: 'Culture & Heritage', icon: '🏛️' },
  { id: 'history', label: 'History & Forts', icon: '🏰' },
  { id: 'temples', label: 'Temples & Spiritual', icon: '🛕' },
  { id: 'nightlife', label: 'Nightlife & Cafes', icon: '🍸' },
  { id: 'shopping', label: 'Local Bazaars & Shopping', icon: '🛍️' },
  { id: 'photography', label: 'Photography & Views', icon: '📸' },
  { id: 'relaxation', label: 'Relaxation & Wellness', icon: '🧘' },
  { id: 'family-friendly', label: 'Family-Friendly', icon: '👨‍👩‍👧‍👦' },
];

// Travel Style Tiers
const TRAVEL_STYLES = [
  {
    id: 'budget-friendly',
    label: 'Budget-Friendly',
    desc: 'Clean hostels, scenic public transit, authentic local dhabas & street eats.',
    badge: 'Saver',
    color: 'emerald',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    desc: '3-star boutique stays, a mix of private cabs & taxis, popular cafes.',
    badge: 'Popular',
    color: 'forest',
  },
  {
    id: 'comfort',
    label: 'Comfort',
    desc: '4-star resorts, dedicated private vehicle, experiential curated tours.',
    badge: 'Comfortable',
    color: 'terracotta',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    desc: '5-star heritage palaces, luxury SUVs, private guides & fine dining.',
    badge: 'Premium',
    color: 'purple',
  },
];

// Chart colors for budget categories
const BUDGET_COLORS = {
  transport: '#d97706',      // amber
  accommodation: '#15803d',  // forest green
  food: '#ea580c',           // terracotta / orange
  activities: '#0284c7',     // sky blue
  miscellaneous: '#64748b',  // slate
};

// Activity category icon mapper
function getCategoryIcon(cat) {
  switch (cat) {
    case 'sightseeing':
      return <Compass className="w-4 h-4 text-emerald-600" />;
    case 'restaurant':
      return <Utensils className="w-4 h-4 text-terracotta-600" />;
    case 'accommodation':
      return <Hotel className="w-4 h-4 text-forest-600" />;
    case 'transportation':
      return <Car className="w-4 h-4 text-amber-600" />;
    case 'activity':
    default:
      return <Ticket className="w-4 h-4 text-sky-600" />;
  }
}

// Compute upcoming default dates (e.g. 1 month from now for 4 days)
function getDefaultDates() {
  const start = new Date();
  start.setDate(start.getDate() + 21);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export function AiTripPlannerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const defaultDates = useMemo(() => getDefaultDates(), []);

  // Form State
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [budget, setBudget] = useState(40000);
  const [budgetType, setBudgetType] = useState('group'); // 'group' | 'per_person'
  const [travellers, setTravellers] = useState(4);
  const [interests, setInterests] = useState(['adventure', 'nature', 'food']);
  const [travelStyle, setTravelStyle] = useState('balanced');
  const [startingCity, setStartingCity] = useState('');
  const [transportPreference, setTransportPreference] = useState('flexible');
  const [accommodationPreference, setAccommodationPreference] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [accessibilityRequirements, setAccessibilityRequirements] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [pace, setPace] = useState('balanced');
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // App UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'budget' | 'packing' | 'tips'
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = Day 1, etc.
  const [checkedPackingItems, setCheckedPackingItems] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedTripInfo, setSavedTripInfo] = useState(null);

  // Activity Edit Modal State
  const [editingActivity, setEditingActivity] = useState(null); // { dayIndex, actIndex, data }

  // Regenerating Day State
  const [regeneratingDayIndex, setRegeneratingDayIndex] = useState(null);

  // Calculate Duration
  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  // Normalized Total and Per-Person Budgets
  const calculatedBudget = useMemo(() => {
    const rawBudget = Number(budget) || 0;
    const travCount = Math.max(1, Number(travellers) || 1);
    if (budgetType === 'per_person') {
      return {
        total: rawBudget * travCount,
        perPerson: rawBudget,
      };
    }
    return {
      total: rawBudget,
      perPerson: Math.round(rawBudget / travCount),
    };
  }, [budget, budgetType, travellers]);

  // Handle Interest Toggle
  const toggleInterest = (id) => {
    setInterests((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((item) => item !== id)
          : prev
        : [...prev, id]
    );
  };

  // Submit Handler: Generate Itinerary
  const handleGenerate = async (e) => {
    e?.preventDefault?.();

    if (!destination.trim()) {
      toast({
        title: 'Destination Required',
        description: 'Please enter or choose a travel destination.',
        variant: 'danger',
      });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast({
        title: 'Invalid Dates',
        description: 'End date must be on or after start date.',
        variant: 'danger',
      });
      return;
    }

    if (durationDays > 14) {
      toast({
        title: 'Trip Too Long',
        description: 'AI planner currently creates detailed itineraries up to 14 days.',
        variant: 'warning',
      });
      return;
    }

    setIsGenerating(true);
    setErrorState(null);
    setGenerationStep(1);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 2500);

    try {
      const payload = {
        destination: destination.trim(),
        startDate,
        endDate,
        budget: Number(budget) || 40000,
        budgetType,
        travellers: Number(travellers) || 1,
        interests,
        travelStyle,
        startingCity: startingCity.trim() || undefined,
        transportPreference: transportPreference !== 'flexible' ? transportPreference : undefined,
        accommodationPreference: accommodationPreference.trim() || undefined,
        dietaryPreferences: dietaryPreferences.trim() || undefined,
        accessibilityRequirements: accessibilityRequirements.trim() || undefined,
        specialRequests: specialRequests.trim() || undefined,
        pace,
      };

      const result = await aiService.generateItinerary(payload);
      clearInterval(stepInterval);

      if (result?.success && result.itinerary) {
        setGeneratedItinerary(result.itinerary);
        setSelectedDayIndex(0);
        setActiveTab('itinerary');
        setSavedTripInfo(null);
        toast({
          title: 'Itinerary Ready!',
          description: `Personalized ${result.itinerary.durationDays}-day plan for ${destination} generated.`,
          variant: 'success',
        });
      } else {
        throw new Error(result?.message || 'Failed to generate itinerary. Please retry.');
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error('AI Generation Error:', err);
      setErrorState({
        message: err.message || 'An error occurred while contacting Gemini AI.',
        isQuota:
          err.message?.includes('quota') ||
          err.message?.includes('rate limit') ||
          err.message?.includes('RESOURCE_EXHAUSTED'),
      });
      toast({
        title: 'Generation Failed',
        description: err.message || 'Please check your inputs and try again.',
        variant: 'danger',
      });
    } finally {
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  // Regenerate a single day
  const handleRegenerateDay = async (dayIdx) => {
    if (!generatedItinerary || regeneratingDayIndex !== null) return;
    const targetDay = generatedItinerary.days[dayIdx];
    if (!targetDay) return;

    setRegeneratingDayIndex(dayIdx);
    try {
      const res = await aiService.regenerateDay({
        destination: generatedItinerary.destination,
        dayNumber: targetDay.day,
        date: targetDay.date,
        travelStyle,
        interests,
        existingDayTitle: targetDay.title,
        travellers: generatedItinerary.travellers,
      });

      if (res?.success && res.dayPlan) {
        setGeneratedItinerary((prev) => {
          const updatedDays = [...prev.days];
          updatedDays[dayIdx] = res.dayPlan;
          return { ...prev, days: updatedDays };
        });
        toast({
          title: `Day ${targetDay.day} Refreshed`,
          description: 'New alternative activities generated.',
          variant: 'success',
        });
      }
    } catch (err) {
      toast({
        title: 'Regeneration Failed',
        description: err.message || 'Could not regenerate this day.',
        variant: 'danger',
      });
    } finally {
      setRegeneratingDayIndex(null);
    }
  };

  // Save Plan to MongoDB
  const handleSaveToMyTrips = async () => {
    if (!generatedItinerary || isSaving || savedTripInfo) return;

    setIsSaving(true);
    try {
      const res = await aiService.saveItinerary(generatedItinerary);
      if (res?.success) {
        setSavedTripInfo({
          tripId: res.tripId,
          title: res.trip?.title || generatedItinerary.tripTitle,
        });
        toast({
          title: 'Trip Saved to TripTally! 🎉',
          description: `All activities and packing items added to your workspace.`,
          variant: 'success',
        });
      } else {
        throw new Error(res?.message || 'Failed to save trip to database.');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save the trip. Your generated plan is safe.',
        variant: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle packing checklist item
  const togglePackingItem = (index) => {
    setCheckedPackingItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Save edited activity
  const handleSaveActivityEdit = () => {
    if (!editingActivity || !generatedItinerary) return;
    const { dayIndex, actIndex, data } = editingActivity;
    setGeneratedItinerary((prev) => {
      const updatedDays = [...prev.days];
      const updatedActs = [...updatedDays[dayIndex].activities];
      updatedActs[actIndex] = {
        ...updatedActs[actIndex],
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        estimatedCost: Number(data.estimatedCost) || 0,
        description: data.description,
        travelNotes: data.travelNotes,
      };
      updatedDays[dayIndex] = { ...updatedDays[dayIndex], activities: updatedActs };
      return { ...prev, days: updatedDays };
    });
    setEditingActivity(null);
    toast({ title: 'Activity Updated', variant: 'success' });
  };

  // Prepare chart data for budget visualization
  const budgetChartData = useMemo(() => {
    if (!generatedItinerary?.budget) return [];
    const b = generatedItinerary.budget;
    return [
      { name: 'Accommodation', value: b.accommodation || 0, color: BUDGET_COLORS.accommodation },
      { name: 'Transport', value: b.transport || 0, color: BUDGET_COLORS.transport },
      { name: 'Food & Dining', value: b.food || 0, color: BUDGET_COLORS.food },
      { name: 'Activities & Sightseeing', value: b.activities || 0, color: BUDGET_COLORS.activities },
      { name: 'Miscellaneous', value: b.miscellaneous || 0, color: BUDGET_COLORS.miscellaneous },
    ].filter((item) => item.value > 0);
  }, [generatedItinerary]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Breadcrumb */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-ivory-300">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-forest-700">
            <Sparkles className="w-4 h-4 text-terracotta-500 animate-spin-slow" />
            <span>Gemini AI Travel Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-charcoal-900 mt-1">
            Personalized AI Itinerary Generator
          </h1>
          <p className="text-sm text-charcoal-500 mt-1">
            Generate realistic, day-by-day travel schedules across India with exact budgets in INR, local tips, and packing essentials.
          </p>
        </div>

        {generatedItinerary && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sliders className="w-4 h-4" />}
              onClick={() => {
                setGeneratedItinerary(null);
                setErrorState(null);
              }}
            >
              Modify Request
            </Button>
            {savedTripInfo ? (
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => navigate(`/trips/${savedTripInfo.tripId}`)}
              >
                Go to Saved Trip
              </Button>
            ) : (
              <Button
                variant="accent"
                size="sm"
                isLoading={isSaving}
                leftIcon={<BookmarkCheck className="w-4 h-4" />}
                onClick={handleSaveToMyTrips}
              >
                Save to My Trips
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Container: Form vs Results */}
      {!generatedItinerary ? (
        /* ================== PLANNING FORM VIEW ================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-forest-600/20 shadow-soft-lg">
              <CardHeader className="bg-gradient-to-r from-forest-50/70 to-ivory-100/50 border-b border-ivory-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-forest-900 flex items-center gap-2">
                      <Compass className="w-5 h-5 text-terracotta-600" />
                      Plan Your Next Indian Getaway
                    </CardTitle>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      Fill in your preferences below. Gemini AI calculates geographic routes and sensible budgets.
                    </p>
                  </div>
                  <Badge variant="forest" size="sm">
                    {durationDays} {durationDays === 1 ? 'Day' : 'Days'} Plan
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Error Banner if any */}
                {errorState && (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      errorState.isQuota
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : errorState.message?.includes('GEMINI_API_KEY') || errorState.message?.includes('key is not configured')
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-current" />
                    <div className="text-xs space-y-1.5 flex-1">
                      <p className="font-semibold text-sm">
                        {errorState.isQuota
                          ? 'Gemini API Limit'
                          : errorState.message?.includes('GEMINI_API_KEY') || errorState.message?.includes('key is not configured')
                          ? 'Gemini API Key Required'
                          : 'Generation Notice'}
                      </p>
                      <p className="leading-relaxed">{errorState.message}</p>
                      {(errorState.message?.includes('GEMINI_API_KEY') || errorState.message?.includes('key is not configured')) && (
                        <div className="mt-2 pt-2 border-t border-blue-200 text-[11px] text-blue-800 space-y-1">
                          <p>
                            <strong>How to configure:</strong>
                          </p>
                          <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                            <li>Get your free API key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline font-semibold text-blue-900">Google AI Studio (aistudio.google.com)</a></li>
                            <li>Add <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono">GEMINI_API_KEY=your_key</code> in <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono">server/.env</code></li>
                            <li>Restart the backend server and click <strong>Generate AI Itinerary</strong></li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                )}


                <form onSubmit={handleGenerate} className="space-y-6">
                  {/* Destination Field & Quick Chips */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-terracotta-500" />
                        Destination in India or Abroad <span className="text-terracotta-500">*</span>
                      </span>
                    </label>
                    <Input
                      placeholder="e.g. Manali, Himachal Pradesh or South Goa"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                      className="text-base"
                    />

                    {/* Quick presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      <span className="text-[11px] font-medium text-charcoal-400 mr-1">Trending:</span>
                      {POPULAR_DESTINATIONS.slice(0, 6).map((dest) => (
                        <button
                          key={dest}
                          type="button"
                          onClick={() => setDestination(dest)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                            destination === dest
                              ? 'bg-forest-600 text-white border-forest-600 font-medium'
                              : 'bg-white text-charcoal-600 border-ivory-300 hover:border-forest-500 hover:text-forest-700'
                          }`}
                        >
                          {dest.split(',')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Travel Dates & Dynamic Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-forest-600" />
                        Start Date <span className="text-terracotta-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-forest-600" />
                        End Date <span className="text-terracotta-500">*</span>
                      </label>
                      <Input
                        type="date"
                        min={startDate}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Budget & Travellers Split */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                          Budget in INR (₹) <span className="text-terracotta-500">*</span>
                        </label>
                        <div className="flex items-center gap-1 bg-ivory-200/80 p-0.5 rounded-lg text-[10px]">
                          <button
                            type="button"
                            onClick={() => setBudgetType('group')}
                            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                              budgetType === 'group'
                                ? 'bg-forest-600 text-white shadow-soft-sm'
                                : 'text-charcoal-600 hover:text-charcoal-900'
                            }`}
                          >
                            Total Group
                          </button>
                          <button
                            type="button"
                            onClick={() => setBudgetType('per_person')}
                            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                              budgetType === 'per_person'
                                ? 'bg-forest-600 text-white shadow-soft-sm'
                                : 'text-charcoal-600 hover:text-charcoal-900'
                            }`}
                          >
                            Per Person
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 font-mono text-sm">
                          ₹
                        </div>
                        <Input
                          type="number"
                          min={1000}
                          step={500}
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          className="pl-8 text-base font-mono font-medium"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-charcoal-500">
                        {budgetType === 'per_person'
                          ? `Total Group Budget: ${formatINR(calculatedBudget.total)} for ${travellers} travellers`
                          : `Approx. ${formatINR(calculatedBudget.perPerson)} per traveller`}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-forest-600" />
                        Number of Travellers <span className="text-terracotta-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={travellers}
                        onChange={(e) => setTravellers(e.target.value)}
                        required
                        className="text-base"
                      />
                      <p className="text-[11px] text-charcoal-500">
                        Family, couple, or friends group
                      </p>
                    </div>
                  </div>

                  {/* Travel Style Selector */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-terracotta-500" />
                      Travel Style
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {TRAVEL_STYLES.map((style) => (
                        <div
                          key={style.id}
                          onClick={() => setTravelStyle(style.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            travelStyle === style.id
                              ? 'bg-forest-50/70 border-forest-600 ring-2 ring-forest-600/20'
                              : 'bg-white border-ivory-300 hover:border-ivory-400 hover:bg-ivory-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-charcoal-900">
                              {style.label}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                travelStyle === style.id
                                  ? 'bg-forest-600 text-white'
                                  : 'bg-ivory-200 text-charcoal-600'
                              }`}
                            >
                              {style.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-charcoal-500 leading-relaxed">
                            {style.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interests Multi-Select Chips */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                        Interests & Activities (Select All That Apply)
                      </label>
                      <span className="text-[11px] text-forest-700 font-medium">
                        {interests.length} selected
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {INTEREST_OPTIONS.map((item) => {
                        const isSelected = interests.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleInterest(item.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all ${
                              isSelected
                                ? 'bg-forest-600 text-white border-forest-600 shadow-soft-sm font-medium'
                                : 'bg-white text-charcoal-700 border-ivory-300 hover:border-forest-400 hover:bg-forest-50/30'
                            }`}
                          >
                            <span className="text-base">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Collapsible Optional Preferences */}
                  <div className="pt-2 border-t border-ivory-200">
                    <button
                      type="button"
                      onClick={() => setShowOptionalFields(!showOptionalFields)}
                      className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-forest-800 hover:text-forest-900 py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        Optional Transit, Stay, & Pace Preferences
                      </span>
                      {showOptionalFields ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {showOptionalFields && (
                      <div className="mt-4 p-4 rounded-xl bg-ivory-100/70 border border-ivory-200 space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase text-charcoal-600">
                              Starting City / Hub
                            </label>
                            <Input
                              placeholder="e.g. Delhi, Mumbai, Bengaluru"
                              value={startingCity}
                              onChange={(e) => setStartingCity(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase text-charcoal-600">
                              Preferred Transit Mode
                            </label>
                            <select
                              value={transportPreference}
                              onChange={(e) => setTransportPreference(e.target.value)}
                              className="w-full h-10 px-3 bg-white text-charcoal-900 text-sm rounded-xl border border-ivory-300 focus:border-forest-600 outline-none"
                            >
                              <option value="flexible">Flexible / Any</option>
                              <option value="flight">Flights (Time-saver)</option>
                              <option value="train">Indian Railways (Vande Bharat / Express)</option>
                              <option value="car">Private Car / Road Trip</option>
                              <option value="bus">Volvo / Sleeper Bus</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase text-charcoal-600">
                              Trip Pace
                            </label>
                            <div className="flex gap-2">
                              {[
                                { id: 'relaxed', label: 'Relaxed (2-3 acts/day)' },
                                { id: 'balanced', label: 'Balanced (3-4 acts/day)' },
                                { id: 'packed', label: 'Packed (Sightseeing rush)' },
                              ].map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setPace(p.id)}
                                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                                    pace === p.id
                                      ? 'bg-forest-600 text-white border-forest-600'
                                      : 'bg-white text-charcoal-600 border-ivory-300'
                                  }`}
                                >
                                  {p.label.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase text-charcoal-600">
                              Dietary Preferences
                            </label>
                            <Input
                              placeholder="e.g. Pure Vegetarian, Jain, Vegan, Local Street Food"
                              value={dietaryPreferences}
                              onChange={(e) => setDietaryPreferences(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold uppercase text-charcoal-600">
                            Special Requests / Accessibility
                          </label>
                          <Input
                            placeholder="e.g. Senior-citizen friendly stairs, honeymoon dinner spot, river-facing stays"
                            value={specialRequests}
                            onChange={(e) => setSpecialRequests(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={isGenerating}
                      disabled={isGenerating}
                      leftIcon={<Sparkles className="w-5 h-5 text-terracotta-400" />}
                      className="w-full text-base font-semibold shadow-soft-lg"
                    >
                      {isGenerating ? 'Planning your trip with Gemini AI...' : 'Generate AI Itinerary'}
                    </Button>
                    <p className="text-[11px] text-center text-charcoal-400 mt-2">
                      Generates structured, editable itinerary in seconds. Powered by Google Gemini AI.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>


          {/* Right Column: Benefits & Highlights */}
          <div className="lg:col-span-4 space-y-6">
            {/* Why Gemini AI Planning Highlight Card */}
            <div className="rounded-2xl bg-forest-900 text-white border border-forest-800 shadow-soft-lg p-6 overflow-hidden relative">
              <div className="relative z-10 space-y-4">

                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-terracotta-400 bg-terracotta-900/40 border border-terracotta-700/50 px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-terracotta-400" />
                  <span>Why Gemini AI Planning?</span>
                </div>

                <div>
                  <h3 className="text-xl font-display font-bold text-white leading-tight">
                    Designed for Indian Travellers
                  </h3>
                  <p className="text-xs text-ivory-200/90 mt-2 leading-relaxed">
                    Unlike generic AI tools, TripTally understands authentic Indian circuits—from Vashisht hot springs to Dawki crystal waters—with accurate budgets in Indian Rupees (₹).
                  </p>
                </div>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-forest-800/80 border border-forest-700/60 shadow-soft-sm">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Chronological Sequencing</h4>
                      <p className="text-ivory-300 text-[11px] mt-0.5 leading-relaxed">
                        Activities grouped by neighborhood so you never waste hours trapped in local traffic.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-forest-800/80 border border-forest-700/60 shadow-soft-sm">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Realistic INR Budgets</h4>
                      <p className="text-ivory-300 text-[11px] mt-0.5 leading-relaxed">
                        Transparent cost estimates for stays, food, transport, and permit fees in ₹.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-forest-800/80 border border-forest-700/60 shadow-soft-sm">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Collaborate & Split</h4>
                      <p className="text-ivory-300 text-[11px] mt-0.5 leading-relaxed">
                        Save directly into TripTally to invite your friends and log shared expenses automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Quick Summary Card */}
            <Card className="p-5 bg-ivory-100/60 border-ivory-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                Current Configuration
              </h4>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-ivory-200/60">
                  <span className="text-charcoal-500">Destination</span>
                  <span className="font-medium text-charcoal-900">{destination || 'Not selected'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ivory-200/60">
                  <span className="text-charcoal-500">Duration</span>
                  <span className="font-medium text-charcoal-900">{durationDays} Days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ivory-200/60">
                  <span className="text-charcoal-500">Total Group Budget</span>
                  <span className="font-mono font-medium text-charcoal-900">{formatINR(calculatedBudget.total)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-charcoal-500">Per Person</span>
                  <span className="font-mono font-medium text-forest-700">{formatINR(calculatedBudget.perPerson)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* ================== GENERATED ITINERARY VIEW ================== */
        <div className="space-y-8 animate-fadeIn">
          {/* Hero Summary Card */}
          <Card className="bg-white border-forest-600/30 shadow-soft-lg overflow-hidden">
            <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-forest-900 text-ivory-100 p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="terracotta" size="sm">
                      {generatedItinerary.durationDays} Days
                    </Badge>
                    <Badge variant="dark" size="sm">
                      {generatedItinerary.travellers} Travellers
                    </Badge>
                    <Badge variant="success" size="sm">
                      ₹{generatedItinerary.currency}
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                    {generatedItinerary.tripTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-ivory-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-terracotta-400" />
                    {generatedItinerary.destination} • {startDate} to {endDate}
                  </p>
                </div>

                {/* Budget Highlight Pill */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col items-end min-w-[200px]">
                  <span className="text-[11px] font-medium text-ivory-300 uppercase tracking-wider">
                    Total Estimated Budget
                  </span>
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-ivory-50 mt-0.5">
                    {formatINR(generatedItinerary.budget?.total || 0)}
                  </span>
                  <span className="text-xs text-emerald-300 font-mono mt-0.5">
                    {formatINR(
                      Math.round(
                        (generatedItinerary.budget?.total || 0) /
                          Math.max(1, generatedItinerary.travellers)
                      )
                    )}{' '}
                    / person
                  </span>
                </div>
              </div>

              {/* Action Buttons inside Header */}
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-white/10">
                {savedTripInfo ? (
                  <Button
                    variant="primary"
                    size="md"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={() => navigate(`/trips/${savedTripInfo.tripId}`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    View in My Trips
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    size="md"
                    isLoading={isSaving}
                    leftIcon={<BookmarkCheck className="w-4 h-4" />}
                    onClick={handleSaveToMyTrips}
                  >
                    Save to My Trips
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  Regenerate Entire Plan
                </Button>

                <Button
                  variant="ghost"
                  size="md"
                  leftIcon={<Sliders className="w-4 h-4" />}
                  onClick={() => setGeneratedItinerary(null)}
                  className="text-ivory-200 hover:text-white hover:bg-white/10"
                >
                  Edit Input Settings
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-ivory-100/70 border-b border-ivory-300 px-6 py-2 flex items-center gap-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('itinerary')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'itinerary'
                    ? 'bg-forest-600 text-white shadow-soft-sm'
                    : 'text-charcoal-600 hover:text-forest-700 hover:bg-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Day-by-Day Schedule ({generatedItinerary.days?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('budget')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'budget'
                    ? 'bg-forest-600 text-white shadow-soft-sm'
                    : 'text-charcoal-600 hover:text-forest-700 hover:bg-white'
                }`}
              >
                <PieIcon className="w-4 h-4" />
                Budget Breakdown
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('packing')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'packing'
                    ? 'bg-forest-600 text-white shadow-soft-sm'
                    : 'text-charcoal-600 hover:text-forest-700 hover:bg-white'
                }`}
              >
                <Luggage className="w-4 h-4" />
                Packing Checklist ({generatedItinerary.packingChecklist?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tips')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'tips'
                    ? 'bg-forest-600 text-white shadow-soft-sm'
                    : 'text-charcoal-600 hover:text-forest-700 hover:bg-white'
                }`}
              >
                <Info className="w-4 h-4" />
                Travel Tips & Assumptions
              </button>
            </div>
          </Card>

          {/* TAB 1: DAY-BY-DAY SCHEDULE */}
          {activeTab === 'itinerary' && (
            <div className="space-y-6">
              {/* Day selector horizontal pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {generatedItinerary.days?.map((day, idx) => (
                  <button
                    key={day.day}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                      selectedDayIndex === idx
                        ? 'bg-forest-600 text-white border-forest-600 shadow-soft-md font-semibold'
                        : 'bg-white text-charcoal-700 border-ivory-300 hover:border-forest-500 hover:bg-forest-50/40'
                    }`}
                  >
                    Day {day.day} • {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>

              {/* Selected Day Container */}
              {generatedItinerary.days?.[selectedDayIndex] && (
                <div className="space-y-6">
                  {/* Day Header Info */}
                  <div className="bg-white p-5 rounded-2xl border border-ivory-300 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="forest" size="sm">
                          Day {generatedItinerary.days[selectedDayIndex].day}
                        </Badge>
                        <span className="text-xs text-charcoal-400 font-medium">
                          {new Date(generatedItinerary.days[selectedDayIndex].date).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-charcoal-900 mt-1">
                        {generatedItinerary.days[selectedDayIndex].title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[11px] text-charcoal-400 block uppercase">
                          Day Est. Spend
                        </span>
                        <span className="text-sm font-mono font-bold text-forest-700">
                          {formatINR(
                            (generatedItinerary.days[selectedDayIndex].activities || []).reduce(
                              (sum, act) => sum + (Number(act.estimatedCost) || 0),
                              0
                            )
                          )}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={regeneratingDayIndex === selectedDayIndex}
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={() => handleRegenerateDay(selectedDayIndex)}
                      >
                        Regenerate Day
                      </Button>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-ivory-300 before:hidden sm:before:block">
                    {generatedItinerary.days[selectedDayIndex].activities?.map((act, actIdx) => (
                      <div
                        key={actIdx}
                        className="relative sm:pl-12 group transition-all"
                      >
                        {/* Timeline Node Dot */}
                        <div className="hidden sm:flex absolute left-3 top-5 -translate-x-1/2 w-5 h-5 rounded-full bg-forest-600 text-white items-center justify-center text-[10px] font-bold ring-4 ring-white shadow-soft-sm">
                          {actIdx + 1}
                        </div>

                        {/* Activity Card */}
                        <Card className="p-5 border-ivory-300 hover:border-forest-400 hover:shadow-soft-md transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-forest-50 text-forest-800 text-[11px] font-mono font-semibold border border-forest-200">
                                  <Clock className="w-3 h-3" />
                                  {act.startTime} — {act.endTime}
                                </span>
                                <Badge variant="neutral" size="sm" className="capitalize">
                                  {getCategoryIcon(act.category)}
                                  <span className="ml-1">{act.category}</span>
                                </Badge>
                                {act.location && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-charcoal-500">
                                    <MapPin className="w-3 h-3 text-terracotta-500" />
                                    {act.location}
                                  </span>
                                )}
                              </div>

                              <h4 className="text-base font-bold text-charcoal-900 group-hover:text-forest-800 transition-colors">
                                {act.name}
                              </h4>
                              <p className="text-xs text-charcoal-600 leading-relaxed">
                                {act.description}
                              </p>

                              {act.travelNotes && (
                                <div className="mt-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-2">
                                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <span>{act.travelNotes}</span>
                                </div>
                              )}
                            </div>

                            {/* Cost Pill & Edit Button */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-ivory-200">
                              <div className="text-right">
                                <span className="text-[10px] uppercase tracking-wider text-charcoal-400 block">
                                  Est. Cost
                                </span>
                                <span className="text-sm font-mono font-bold text-charcoal-900">
                                  {act.estimatedCost > 0 ? formatINR(act.estimatedCost) : 'Free / Included'}
                                </span>
                                <span className="text-[10px] text-charcoal-400 block capitalize">
                                  {act.costType === 'per_person' ? 'Per Person' : 'Group Total'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingActivity({
                                    dayIndex: selectedDayIndex,
                                    actIndex: actIdx,
                                    data: { ...act },
                                  })
                                }
                                className="p-1.5 text-charcoal-400 hover:text-forest-700 hover:bg-ivory-200 rounded-lg transition-colors"
                                title="Edit activity"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUDGET BREAKDOWN & CHART */}
          {activeTab === 'budget' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-6">
                <Card className="p-6">
                  <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-forest-600" />
                    Category Allocation Breakdown
                  </CardTitle>
                  <p className="text-xs text-charcoal-400 mt-1">
                    Balanced allocation calculated in Indian Rupees (INR) for {generatedItinerary.travellers} travellers.
                  </p>

                  <div className="mt-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={budgetChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {budgetChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value) => [formatINR(value), 'Est. Allocation']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <Card className="p-6">
                  <CardTitle className="text-base font-bold text-charcoal-900">
                    Budget Summary
                  </CardTitle>
                  <div className="mt-4 space-y-3 text-xs">
                    {budgetChartData.map((cat) => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-ivory-200"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-medium text-charcoal-800">{cat.name}</span>
                        </div>
                        <span className="font-mono font-bold text-charcoal-900">
                          {formatINR(cat.value)}
                        </span>
                      </div>
                    ))}

                    <div className="pt-3 border-t border-ivory-300 flex items-center justify-between text-sm">
                      <span className="font-bold text-charcoal-900">Total Group Budget</span>
                      <span className="font-mono font-bold text-forest-700 text-base">
                        {formatINR(generatedItinerary.budget?.total || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-charcoal-500">
                      <span>Per Traveller ({generatedItinerary.travellers} people)</span>
                      <span className="font-mono font-semibold">
                        {formatINR(
                          Math.round(
                            (generatedItinerary.budget?.total || 0) /
                              Math.max(1, generatedItinerary.travellers)
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 3: PACKING CHECKLIST */}
          {activeTab === 'packing' && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ivory-200">
                  <div>
                    <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                      <Luggage className="w-5 h-5 text-terracotta-600" />
                      Trip Packing Checklist
                    </CardTitle>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      Curated specifically for {generatedItinerary.destination} climate and scheduled activities.
                    </p>
                  </div>
                  <Badge variant="forest" size="md">
                    {Object.values(checkedPackingItems).filter(Boolean).length} /{' '}
                    {generatedItinerary.packingChecklist?.length || 0} Packed
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                  {generatedItinerary.packingChecklist?.map((item, idx) => {
                    const isChecked = !!checkedPackingItems[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => togglePackingItem(idx)}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                            : 'bg-white border-ivory-300 hover:border-forest-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-ivory-400 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              isChecked ? 'line-through text-charcoal-400' : 'text-charcoal-800'
                            }`}
                          >
                            {item.item}
                          </span>
                        </div>

                        {item.essential && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-600 bg-terracotta-50 px-2 py-0.5 rounded border border-terracotta-200/60">
                            Essential
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: TRAVEL TIPS & ASSUMPTIONS */}
          {activeTab === 'tips' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border-forest-600/20">
                <CardTitle className="text-base font-bold text-forest-900 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  Local Insider Travel Tips
                </CardTitle>
                <div className="mt-4 space-y-3">
                  {generatedItinerary.travelTips?.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-forest-50/50 border border-forest-200/50 text-xs text-charcoal-700">
                      <span className="w-5 h-5 rounded-full bg-forest-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 border-ivory-300">
                <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-charcoal-500" />
                  Assumptions & Seasonal Caveats
                </CardTitle>
                <div className="mt-4 space-y-3">
                  {generatedItinerary.assumptions?.map((assump, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-ivory-100/70 border border-ivory-200 text-xs text-charcoal-600">
                      <Info className="w-4 h-4 text-charcoal-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{assump}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Activity Edit Modal */}
      {editingActivity && (
        <Dialog
          isOpen={true}
          onClose={() => setEditingActivity(null)}
          title="Edit Scheduled Activity"
          description="Adjust timings, name, location, and cost for this activity."
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-charcoal-700 uppercase">Activity Name</label>
              <Input
                value={editingActivity.data.name}
                onChange={(e) =>
                  setEditingActivity((prev) => ({
                    ...prev,
                    data: { ...prev.data, name: e.target.value },
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700 uppercase">Start Time</label>
                <Input
                  type="time"
                  value={editingActivity.data.startTime}
                  onChange={(e) =>
                    setEditingActivity((prev) => ({
                      ...prev,
                      data: { ...prev.data, startTime: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700 uppercase">End Time</label>
                <Input
                  type="time"
                  value={editingActivity.data.endTime}
                  onChange={(e) =>
                    setEditingActivity((prev) => ({
                      ...prev,
                      data: { ...prev.data, endTime: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700 uppercase">Location</label>
                <Input
                  value={editingActivity.data.location}
                  onChange={(e) =>
                    setEditingActivity((prev) => ({
                      ...prev,
                      data: { ...prev.data, location: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700 uppercase">Est. Cost (₹)</label>
                <Input
                  type="number"
                  min={0}
                  value={editingActivity.data.estimatedCost}
                  onChange={(e) =>
                    setEditingActivity((prev) => ({
                      ...prev,
                      data: { ...prev.data, estimatedCost: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal-700 uppercase">Description</label>
              <textarea
                rows={2}
                value={editingActivity.data.description}
                onChange={(e) =>
                  setEditingActivity((prev) => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value },
                  }))
                }
                className="w-full p-2.5 rounded-xl border border-ivory-300 text-sm focus:border-forest-600 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal-700 uppercase">Travel Notes / Tips</label>
              <textarea
                rows={2}
                value={editingActivity.data.travelNotes}
                onChange={(e) =>
                  setEditingActivity((prev) => ({
                    ...prev,
                    data: { ...prev.data, travelNotes: e.target.value },
                  }))
                }
                className="w-full p-2.5 rounded-xl border border-ivory-300 text-sm focus:border-forest-600 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-ivory-200">
              <Button variant="secondary" size="sm" onClick={() => setEditingActivity(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveActivityEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default AiTripPlannerPage;

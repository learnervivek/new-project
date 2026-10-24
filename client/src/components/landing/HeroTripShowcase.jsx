import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ThumbsUp,
  Clock,
  IndianRupee,
  Share2,
  Check,
  ChevronRight,
  ShieldCheck,
  Flame,
  Plus
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';

const SAMPLE_CIRCUITS = [
  {
    id: 'manali',
    chipLabel: '🏔️ Manali Snow Trail',
    name: 'Manali & Solang Valley Expedition',
    region: 'Himachal Pradesh, India',
    tag: 'Snow Slopes & High Passes',
    weather: '-2°C • Fresh Snowfall',
    dates: '14 Nov – 19 Nov (5 Days)',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    totalBudget: 40000,
    perPerson: 10000,
    members: [
      { name: 'Arjun S.', role: 'Organizer', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Priya M.', role: 'Editor', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Rohan P.', role: 'Member', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', paid: false },
      { name: 'Sneha K.', role: 'Member', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80', paid: true },
    ],
    expenseSplit: {
      title: 'Solang 4x4 Gypsy & Pine Cabin',
      totalCost: 28400,
      payer: 'Arjun Sharma',
      settlementNote: 'Priya settled ₹7,100 via Google Pay UPI',
      breakdown: [
        { label: 'Riverside Stay', amount: 16000 },
        { label: '4x4 Gypsy Drive', amount: 8400 },
        { label: 'Trout Dining', amount: 4000 },
      ]
    },
    days: [
      {
        dayNum: 1,
        title: 'Arrival & Old Manali',
        items: [
          { id: 'm1', time: '11:30 AM', title: 'Beas Riverfront Cabin Check-in', cost: 16000, category: 'Stay', votes: 4 },
          { id: 'm2', time: '02:00 PM', title: 'Himalayan Trout & Woodfired Pizza at Cafe 1947', cost: 2400, category: 'Food', votes: 4 },
        ]
      },
      {
        dayNum: 2,
        title: 'Solang Snow & Sports',
        items: [
          { id: 'm4', time: '09:00 AM', title: 'Solang Valley High Altitude Paragliding', cost: 3500, category: 'Adventure', votes: 5 },
          { id: 'm5', time: '01:30 PM', title: 'Snow Scooter Trails & Steaming Thukpa', cost: 1800, category: 'Food', votes: 4 },
        ]
      },
      {
        dayNum: 3,
        title: 'Atal Tunnel & Sissu',
        items: [
          { id: 'm7', time: '08:30 AM', title: 'Atal Tunnel Crossing to Lahaul Valley', cost: 4500, category: 'Transit', votes: 4 },
          { id: 'm8', time: '12:00 PM', title: 'Sissu Frozen Waterfall & River Walk', cost: 0, category: 'Sightseeing', votes: 4 },
        ]
      }
    ]
  },
  {
    id: 'goa',
    chipLabel: '🏖️ South Goa Coastal',
    name: 'South Goa Sunsets & Heritage Shacks',
    region: 'Goa, India',
    tag: 'Secluded Beaches & Shacks',
    weather: '28°C • Sunny & Breezy',
    dates: '05 Dec – 10 Dec (5 Days)',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    totalBudget: 32000,
    perPerson: 8000,
    members: [
      { name: 'Kunal R.', role: 'Organizer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Ananya D.', role: 'Editor', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Sameer V.', role: 'Member', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Dia S.', role: 'Member', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80', paid: false },
    ],
    expenseSplit: {
      title: 'Palolem Beach Villa & Scooters',
      totalCost: 24600,
      payer: 'Kunal Roy',
      settlementNote: 'Ananya settled ₹6,150 via PhonePe UPI',
      breakdown: [
        { label: 'Private Villa', amount: 16000 },
        { label: '4x Scooters', amount: 4200 },
        { label: 'Seafood Dinner', amount: 4400 },
      ]
    },
    days: [
      {
        dayNum: 1,
        title: 'Fontainhas & Latin Quarters',
        items: [
          { id: 'g1', time: '11:00 AM', title: 'Heritage Fontainhas Walk & Pastel Houses', cost: 0, category: 'Culture', votes: 4 },
          { id: 'g2', time: '02:00 PM', title: 'Bebinca & Goan Fish Curry at Viva Panjim', cost: 2200, category: 'Food', votes: 4 },
        ]
      },
      {
        dayNum: 2,
        title: 'Palolem & Kayak Coves',
        items: [
          { id: 'g4', time: '08:30 AM', title: 'Palolem Island Sea Kayaking', cost: 1800, category: 'Adventure', votes: 5 },
          { id: 'g5', time: '04:30 PM', title: 'Butterfly Beach Boat Ride at Golden Hour', cost: 2500, category: 'Cruise', votes: 4 },
        ]
      },
      {
        dayNum: 3,
        title: 'Cabo de Rama Fort',
        items: [
          { id: 'g6', time: '10:00 AM', title: 'Cliffside Fort Exploration & Sea Breeze', cost: 0, category: 'Sightseeing', votes: 4 },
          { id: 'g7', time: '01:00 PM', title: 'Beach Shack Crab Masala Feast', cost: 3400, category: 'Food', votes: 4 },
        ]
      }
    ]
  },
  {
    id: 'kashmir',
    chipLabel: '❄️ Kashmir & Gulmarg',
    name: 'Srinagar Dal Lake & Gulmarg Ski Trail',
    region: 'Jammu & Kashmir, India',
    tag: 'Paradise on Earth',
    weather: '1°C • Alpine Frost',
    dates: '20 Dec – 26 Dec (6 Days)',
    image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80',
    totalBudget: 54000,
    perPerson: 13500,
    members: [
      { name: 'Tenzing N.', role: 'Organizer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Mira K.', role: 'Editor', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Farhan A.', role: 'Member', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Isha B.', role: 'Member', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80', paid: false },
    ],
    expenseSplit: {
      title: 'Cedar Houseboat & Gulmarg Gondola',
      totalCost: 42000,
      payer: 'Tenzing N.',
      settlementNote: 'Mira settled ₹10,500 via Paytm UPI',
      breakdown: [
        { label: 'Dal Lake Houseboat', amount: 22000 },
        { label: 'Gondola Tickets', amount: 8000 },
        { label: 'Wazwan Feast', amount: 12000 },
      ]
    },
    days: [
      {
        dayNum: 1,
        title: 'Dal Lake Houseboat',
        items: [
          { id: 'k1', time: '02:00 PM', title: 'Traditional Cedar Carved Houseboat Check-in', cost: 22000, category: 'Stay', votes: 4 },
          { id: 'k2', time: '04:30 PM', title: 'Sunset Shikara Ride & Saffron Kehwa', cost: 1600, category: 'Cruise', votes: 5 },
        ]
      },
      {
        dayNum: 2,
        title: 'Gulmarg Gondola Phase 2',
        items: [
          { id: 'k3', time: '08:30 AM', title: 'Scenic Drive through Pine Valleys', cost: 3500, category: 'Transit', votes: 4 },
          { id: 'k4', time: '11:00 AM', title: 'Gondola Phase-2 Ride to 13,780 ft Peak', cost: 8000, category: 'Adventure', votes: 5 },
        ]
      },
      {
        dayNum: 3,
        title: 'Pahalgam Betaab Valley',
        items: [
          { id: 'k5', time: '09:00 AM', title: 'Lidder River Trail & Saffron Farms', cost: 0, category: 'Nature', votes: 4 },
          { id: 'k6', time: '01:30 PM', title: 'Authentic 7-Course Kashmiri Wazwan', cost: 4800, category: 'Food', votes: 5 },
        ]
      }
    ]
  },
  {
    id: 'jaipur',
    chipLabel: '🏰 Royal Jaipur & Forts',
    name: 'Jaipur Heritage Palaces & Bazaar Trails',
    region: 'Rajasthan, India',
    tag: 'Forts, Palaces & Desert Twilight',
    weather: '22°C • Pleasant Sunlight',
    dates: '18 Jan – 22 Jan (4 Days)',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
    totalBudget: 28000,
    perPerson: 7000,
    members: [
      { name: 'Dev R.', role: 'Organizer', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Ritu V.', role: 'Editor', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Kavya S.', role: 'Member', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80', paid: true },
      { name: 'Nikhil J.', role: 'Member', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', paid: false },
    ],
    expenseSplit: {
      title: 'Heritage Haveli & Palace Passports',
      totalCost: 21800,
      payer: 'Dev Rathore',
      settlementNote: 'Ritu settled ₹5,450 via BHIM UPI',
      breakdown: [
        { label: 'Haveli Stay', amount: 13000 },
        { label: 'Fort Entries & Guide', amount: 3800 },
        { label: 'Rajasthani Thali', amount: 5000 },
      ]
    },
    days: [
      {
        dayNum: 1,
        title: 'Amer Fort & Light Show',
        items: [
          { id: 'j1', time: '03:30 PM', title: 'Amer Fort Exploration & Sheesh Mahal', cost: 2000, category: 'Heritage', votes: 4 },
          { id: 'j2', time: '07:00 PM', title: 'Maota Lake Sound & Light Spectacle', cost: 1200, category: 'Show', votes: 4 },
        ]
      },
      {
        dayNum: 2,
        title: 'Hawa Mahal & Johari Bazaar',
        items: [
          { id: 'j3', time: '08:30 AM', title: 'Morning Photowalk outside Hawa Mahal', cost: 0, category: 'Culture', votes: 5 },
          { id: 'j4', time: '01:00 PM', title: 'LMB Ghewar & Pyaaz Kachori Lunch', cost: 1400, category: 'Food', votes: 4 },
        ]
      },
      {
        dayNum: 3,
        title: 'Nahargarh Sunset & Feasts',
        items: [
          { id: 'j5', time: '04:30 PM', title: 'Nahargarh Fort Panoramic City Sunset', cost: 600, category: 'Sightseeing', votes: 5 },
          { id: 'j6', time: '08:00 PM', title: 'Chokhi Dhani Folk Dance & Feast', cost: 3600, category: 'Experience', votes: 4 },
        ]
      }
    ]
  }
];

export function HeroTripShowcase({ onPlanTripClick }) {
  const [selectedCircuitId, setSelectedCircuitId] = useState('manali');
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'ledger'
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [votes, setVotes] = useState({ m4: 5, m1: 4, g4: 5, k2: 5, j3: 5 });
  const { toast } = useToast();

  const circuit = SAMPLE_CIRCUITS.find((c) => c.id === selectedCircuitId) || SAMPLE_CIRCUITS[0];

  const handleVote = (itemId, itemTitle) => {
    setVotes((prev) => {
      const current = prev[itemId] || 4;
      const next = current + 1;
      toast.success(
        'Upvoted with Group!',
        `Your vote for "${itemTitle}" was recorded. (Total votes: ${next})`
      );
      return { ...prev, [itemId]: next };
    });
  };

  return (
    <div className="w-full relative rounded-2xl sm:rounded-3xl bg-white border border-ivory-300/80 shadow-soft-2xl overflow-hidden text-charcoal-900">
      
      {/* ---------------- Top Quick-Pick Destination Switcher ---------------- */}
      <div className="bg-ivory-100/90 border-b border-ivory-200 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-forest-800 shrink-0">
            Live Workspace:
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {SAMPLE_CIRCUITS.map((item) => {
            const isSelected = item.id === circuit.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedCircuitId(item.id);
                  setActiveDayIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 shrink-0 ${
                  isSelected
                    ? 'bg-forest-900 text-ivory-50 shadow-soft font-semibold'
                    : 'bg-white hover:bg-ivory-200/80 text-charcoal-700 border border-ivory-300/60'
                }`}
              >
                {item.chipLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- Hero Photography Banner (Sleek Compact Panoramic Height) ---------------- */}
      <div className="relative h-32 sm:h-36 lg:h-40 w-full overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.img
            key={circuit.id}
            src={circuit.image}
            alt={circuit.name}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-cover object-center"
          />
        </AnimatePresence>

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/90 via-charcoal-950/30 to-transparent pointer-events-none" />

        {/* Floating Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-charcoal-950/70 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-[11px] font-medium shadow-soft">
            <Sparkles className="w-3 h-3 text-amber-300 animate-spin-slow" />
            <span>{circuit.weather}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-forest-950/80 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-[10px] sm:text-[11px] font-semibold shadow-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>4 Friends In Workspace</span>
          </div>
        </div>

        {/* Bottom Banner Content */}
        <div className="absolute bottom-2.5 left-3 right-3 text-white">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium mb-0.5">
            <MapPin className="w-3 h-3 text-terracotta-400 shrink-0" />
            <span>{circuit.region}</span>
            <span>•</span>
            <span className="text-ivory-200">{circuit.dates}</span>
          </div>
          <h3 className="font-serif text-sm sm:text-base lg:text-lg font-bold leading-tight drop-shadow-md truncate">
            {circuit.name}
          </h3>
        </div>
      </div>

      {/* ---------------- Collaborative Members & Interactive Tabs ---------------- */}
      <div className="px-3.5 py-2 bg-ivory-50/90 border-b border-ivory-200/80 flex flex-wrap items-center justify-between gap-2">
        {/* Member Avatars */}
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5 overflow-hidden">
            {circuit.members.map((m, idx) => (
              <img
                key={idx}
                src={m.avatar}
                alt={m.name}
                title={`${m.name} (${m.role})`}
                className="w-6 h-6 rounded-full border border-white object-cover ring-1 ring-ivory-300"
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-charcoal-600">
            <strong className="text-charcoal-800">4 Active</strong> planners
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="inline-flex p-0.5 rounded-lg bg-ivory-200/70 border border-ivory-300/80 text-[11px] font-medium">
          <button
            onClick={() => setActiveTab('itinerary')}
            className={`px-2.5 py-0.5 rounded-md transition-all ${
              activeTab === 'itinerary'
                ? 'bg-white text-forest-900 font-semibold shadow-soft-sm'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            🗺️ Timeline
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-2.5 py-0.5 rounded-md transition-all ${
              activeTab === 'ledger'
                ? 'bg-white text-forest-900 font-semibold shadow-soft-sm'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            💰 Split Ledger & UPI
          </button>
        </div>
      </div>

      {/* ---------------- Interactive Body (Timeline or Ledger) ---------------- */}
      <div className="p-3 sm:p-3.5 min-h-[160px]">
        {activeTab === 'itinerary' ? (
          <div>
            {/* Day Pills */}
            <div className="flex items-center gap-1.5 mb-2.5">
              {circuit.days.map((d, index) => (
                <button
                  key={d.dayNum}
                  onClick={() => setActiveDayIndex(index)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                    activeDayIndex === index
                      ? 'bg-forest-900 text-white shadow-soft-sm'
                      : 'bg-ivory-100 hover:bg-ivory-200 text-charcoal-600'
                  }`}
                >
                  Day {d.dayNum}: {d.title.split('&')[0]}
                </button>
              ))}
            </div>

            {/* Activities List (2 Curated Highlights Per Day) */}
            <div className="space-y-2">
              {circuit.days[activeDayIndex]?.items.map((item) => {
                const currentVotes = votes[item.id] || item.votes;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-ivory-100/70 hover:bg-white border border-ivory-200/90 hover:border-forest-600/30 shadow-soft-sm transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-14 shrink-0 text-left">
                        <span className="text-[10px] font-mono font-bold text-forest-700 block leading-tight">
                          {item.time}
                        </span>
                        <span className="text-[9px] uppercase font-semibold text-charcoal-500">
                          {item.category}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-charcoal-900 truncate">
                          {item.title}
                        </h5>
                        <p className="text-[10px] font-mono font-medium text-terracotta-600">
                          {item.cost > 0 ? formatINR(item.cost) : 'Free • Included'}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Upvote Button */}
                    <button
                      onClick={() => handleVote(item.id, item.title)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-forest-50 border border-ivory-300 hover:border-forest-600/40 text-charcoal-700 hover:text-forest-800 text-[11px] font-semibold shadow-soft-sm transition-all shrink-0 active:scale-95"
                      title="Vote for this activity"
                    >
                      <ThumbsUp className="w-3 h-3 text-forest-600" />
                      <span>{currentVotes}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Expense Split & UPI Settlements Tab */
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-gradient-to-br from-forest-900 to-forest-950 text-white shadow-soft">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ivory-100 truncate">
                      {circuit.expenseSplit.title}
                    </h4>
                    <p className="text-[10px] text-emerald-300 truncate">
                      Paid by {circuit.expenseSplit.payer} • Equal 4-way split
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-bold text-terracotta-300">
                    {formatINR(circuit.expenseSplit.totalCost)}
                  </div>
                  <div className="text-[9px] text-ivory-300">
                    {formatINR(Math.round(circuit.expenseSplit.totalCost / 4))} / person
                  </div>
                </div>
              </div>

              {/* Verified UPI Settlement Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-forest-800/80 border border-emerald-500/30 text-[11px] text-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{circuit.expenseSplit.settlementNote}</span>
              </div>
            </div>

            {/* Category Breakdown Chips */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              {circuit.expenseSplit.breakdown.map((item, idx) => (
                <div key={idx} className="p-1.5 rounded-lg bg-ivory-100 border border-ivory-200">
                  <p className="text-[9px] text-charcoal-500 font-medium truncate">
                    {item.label}
                  </p>
                  <p className="font-mono text-[11px] font-bold text-forest-900">
                    {formatINR(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------------- Bottom Footer CTA Bar ---------------- */}
      <div className="px-3.5 py-2.5 bg-ivory-100/90 border-t border-ivory-200 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-charcoal-500 block leading-tight">
            Estimated Group Budget
          </span>
          <span className="font-serif text-sm sm:text-base font-bold text-forest-900 leading-tight">
            {formatINR(circuit.totalBudget)}{' '}
            <span className="text-[11px] font-normal text-charcoal-600 font-sans">
              ({formatINR(circuit.perPerson)} / person)
            </span>
          </span>
        </div>

        <button
          onClick={() => {
            if (onPlanTripClick) {
              onPlanTripClick(circuit);
            }
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-semibold text-xs shadow-soft transition-all duration-200 hover:shadow-soft-lg group shrink-0"
        >
          <span>Plan This Trip</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

    </div>
  );
}

export default HeroTripShowcase;

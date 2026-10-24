import React, { useState, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  Users,
  Receipt,
  MapPin,
  Calendar,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Split,
  PieChart,
  HelpCircle,
  Share2,
  ChevronDown,
  Globe2,
  Navigation,
  Check,
  Star,
  ExternalLink,
  Layers,
  HeartHandshake,
  Smartphone,
  IndianRupee,
  Clock,
  Car,
  Compass as CompassIcon,
  Tent,
  Luggage,
  Bell,
  CreditCard
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ProductPreview from '../components/landing/ProductPreview';
import AuthModal from '../components/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/currency';

// Interactive Dynamic Hero Trip Showcase component
import HeroTripShowcase from '../components/landing/HeroTripShowcase';

// A. Curated Popular Indian Destinations with authentic Unsplash photography
const popularDestinations = [
  {
    id: 'manali',
    name: 'Manali & Solang Valley',
    state: 'Himachal Pradesh',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    alt: 'Snow-capped Himalayan peaks and pine forests in Solang Valley near Manali',
    duration: '5 Days',
    travelers: '4 Travellers',
    estBudget: 40000,
    tag: 'Snow & Adventure',
    tagVariant: 'forest',
    description: 'Crisp pine air, Solang Valley snow adventure, paragliding, and cozy Old Manali riverside cafes.',
  },
  {
    id: 'goa',
    name: 'Goa Coastal Getaway',
    state: 'Goa',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    alt: 'Palm-fringed golden sandy beach and Arabian Sea sunset in Goa',
    duration: '4 Days',
    travelers: '5 Travellers',
    estBudget: 36000,
    tag: 'Beaches & Shacks',
    tagVariant: 'terracotta',
    description: 'Golden Arabian Sea sunsets, beach shacks, Fontainhas Latin quarter, water sports, and seaside dining.',
  },
  {
    id: 'jaipur',
    name: 'Jaipur & Udaipur',
    state: 'Rajasthan',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
    alt: 'Intricate pink sandstone facade of Hawa Mahal in Jaipur Rajasthan',
    duration: '4 Days',
    travelers: '4 Travellers',
    estBudget: 32000,
    tag: 'Royal Heritage',
    tagVariant: 'neutral',
    description: 'Majestic Amer Fort, romantic sunset boat cruises on Lake Pichola, and royal Rajasthani thali dinners.',
  },
  {
    id: 'kerala',
    name: 'Kerala Backwaters & Munnar',
    state: 'Kerala',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
    alt: 'Traditional wooden houseboat navigating emerald palm-lined backwaters of Alleppey Kerala',
    duration: '6 Days',
    travelers: '4 Travellers',
    estBudget: 55000,
    tag: "God's Own Country",
    tagVariant: 'forest',
    description: 'Tranquil Alleppey private houseboats, misty Munnar tea estate walks, and authentic Ayurvedic wellness.',
  },
  {
    id: 'kashmir',
    name: 'Srinagar & Gulmarg',
    state: 'Jammu & Kashmir',
    image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80',
    alt: 'Traditional wooden Shikara boat floating on the serene waters of Dal Lake Srinagar',
    duration: '6 Days',
    travelers: '4 Travellers',
    estBudget: 65000,
    tag: 'Himalayan Heaven',
    tagVariant: 'terracotta',
    description: 'Shikara rides on Dal Lake, Gulmarg Gondola Phase 2 snow heights, saffron valleys, and pine forests.',
  },
  {
    id: 'delhi',
    name: 'Delhi Heritage & Golden Triangle',
    state: 'Delhi NCR',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
    alt: 'Majestic India Gate memorial illuminated at sunset in New Delhi',
    duration: '3 Days',
    travelers: '3 Travellers',
    estBudget: 24000,
    tag: 'Capital Heritage',
    tagVariant: 'forest',
    description: 'Iconic India Gate, historic Red Fort, bustling Chandni Chowk street food, and regal Mughal architecture.',
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh & Haridwar',
    state: 'Uttarakhand',
    image: 'https://images.unsplash.com/photo-1718383538820-524dd564fd06?auto=format&fit=crop&w=800&q=80',
    alt: 'Tera Manzil Temple overlooking the sacred turquoise Ganges river with rafting boats in Rishikesh Uttarakhand',
    duration: '3 Days',
    travelers: '4 Travellers',
    estBudget: 18000,
    tag: 'Rafting & Serenity',
    tagVariant: 'neutral',
    description: 'Grade-3 white water Ganga rafting, peaceful Triveni Ghat evening maha aarti, and iconic river suspension bridges.',
  },
  {
    id: 'varanasi',
    name: 'Varanasi Ancient Ghats',
    state: 'Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=800&q=80',
    alt: 'Dawn wooden boat ride on the holy Ganges river along the ancient stone ghats and temples in Varanasi',
    duration: '3 Days',
    travelers: '2 Travellers',
    estBudget: 22000,
    tag: 'Spiritual Legacy',
    tagVariant: 'terracotta',
    description: 'Dawn wooden boat ride on the holy Ganges, grand Dashashwamedh evening aarti, and historic silk corridors.',
  },
];

// B. Plan Your Next Trip: Believable Indian Group Trip Templates
const readyTripPlans = [
  {
    id: 'delhi-manali',
    title: 'Delhi to Manali Road Trip',
    duration: '5 Days / 4 Nights',
    route: 'Delhi • Chandigarh • Kullu • Manali • Solang',
    budget: 40000,
    perPerson: 10000,
    travelers: '4 Friends',
    transport: 'Overnight Volvo & Local 4x4',
    highlights: ['Solang Valley Snow Point', 'Atal Tunnel Drive', 'Old Manali Cafe Crawl', 'Hadimba Temple'],
    category: 'Hill Station & Adventure',
  },
  {
    id: 'jaipur-udaipur',
    title: 'Jaipur & Udaipur Royal Circuit',
    duration: '4 Days / 3 Nights',
    route: 'Jaipur • Ajmer • Pushkar • Udaipur',
    budget: 32000,
    perPerson: 8000,
    travelers: '4 Travellers',
    transport: 'Vande Bharat / Private Cab',
    highlights: ['Amer Fort Light Show', 'City Palace & Lake Pichola', 'Johari Bazaar Souvenirs', 'Dal Baati Churma'],
    category: 'Heritage & Culture',
  },
  {
    id: 'rishikesh-getaway',
    title: 'Rishikesh Weekend Getaway',
    duration: '3 Days / 2 Nights',
    route: 'Delhi/NCR • Haridwar • Rishikesh • Shivpuri',
    budget: 18000,
    perPerson: 4500,
    travelers: '4 Friends',
    transport: 'Express Highway Carpool',
    highlights: ['16km River Rafting & Cliff Jump', 'Riverside Campfire & BBQ', 'Triveni Ghat Evening Aarti'],
    category: 'Weekend Thrills',
  },
  {
    id: 'kerala-escape',
    title: 'Kerala Backwaters & Hills Escape',
    duration: '6 Days / 5 Nights',
    route: 'Kochi • Munnar • Thekkady • Alleppey',
    budget: 55000,
    perPerson: 13750,
    travelers: '4 Travellers',
    transport: 'Flight to Kochi + Chauffeur Cab',
    highlights: ['Overnight Houseboat in Alleppey', 'Munnar Tea Plantation Treks', 'Kathakali Martial Arts Show'],
    category: 'Nature & Wellness',
  },
  {
    id: 'goa-friends',
    title: 'Goa Coastal Hangout with Friends',
    duration: '4 Days / 3 Nights',
    route: 'North Goa (Anjuna) • Panaji • South Goa (Palolem)',
    budget: 36000,
    perPerson: 9000,
    travelers: '4 Friends',
    transport: 'Direct Flight + Scooters/Thar Rental',
    highlights: ['Curties Shacks & Catamaran Sunset', 'Fontainhas Portuguese Walk', 'Chapora Fort Sunset Views'],
    category: 'Beach & Leisure',
  },
  {
    id: 'kashmir-adventure',
    title: 'Kashmir Paradise Adventure',
    duration: '6 Days / 5 Nights',
    route: 'Srinagar • Gulmarg • Pahalgam • Sonmarg',
    budget: 65000,
    perPerson: 16250,
    travelers: '4 Travellers',
    transport: 'Flight to Srinagar + Private Innova',
    highlights: ['Dal Lake Houseboat Stay', 'Gulmarg Gondola Phase 2 Ski Heights', 'Aru & Betaab Valleys'],
    category: 'Himalayan Luxury',
  },
];

// C. Integrated Platform Capabilities & Core Features
const integratedFeatures = [
  {
    id: 'ai-itinerary',
    title: 'Personalised AI Itinerary Generator',
    category: 'AI Assistant',
    tag: 'Gemini 2.5 Flash',
    tagVariant: 'forest',
    description:
      'Generate day-by-day travel plans customized to your destination, dates, budget in INR, companions, and travel style with activities and cost estimates.',
    icon: Sparkles,
    link: '/ai-trip-planner',
    actionText: 'Try AI Planner',
  },
  {
    id: 'collaborative-workspace',
    title: 'Collaborative Group Workspaces',
    category: 'Co-Planning',
    tag: 'Role Permissions',
    tagVariant: 'terracotta',
    description:
      'Invite travel companions via email or a 1-click WhatsApp link. Assign Organizer, Editor, or Viewer roles so everyone stays on the exact same page.',
    icon: Users,
    link: '/trips',
    actionText: 'Start Group Trip',
  },
  {
    id: 'itinerary-management',
    title: 'Day-by-Day Schedule & Routes',
    category: 'Organization',
    tag: 'Interactive Maps',
    tagVariant: 'forest',
    description:
      'Structure daily schedules, transit timing, hotel stays, and attractions. Explore pin drops and geographic routes with interactive OpenStreetMap views.',
    icon: Calendar,
    link: '/trips',
    actionText: 'View Timeline',
  },
  {
    id: 'expense-splitting',
    title: 'Rupee Expense Splitting & Ledgers',
    category: 'Finances',
    tag: '100% in INR',
    tagVariant: 'terracotta',
    description:
      'Log group expenses in Indian Rupees with equal or custom splits. Our debt minimization algorithm calculates net balances with minimal direct transfers.',
    icon: Split,
    link: '/trips',
    actionText: 'Split Expenses',
  },
  {
    id: 'budget-analytics',
    title: 'Budget Tracking & Spending Alerts',
    category: 'Analytics',
    tag: 'Real-Time Insights',
    tagVariant: 'forest',
    description:
      'Monitor group targets against actual spend across Lodging, Food, Transport, and Activities. Configure alert thresholds to keep group savings on track.',
    icon: PieChart,
    link: '/trips',
    actionText: 'Track Budget',
  },
  {
    id: 'packing-checklist',
    title: 'Smart Packing Checklist',
    category: 'Preparedness',
    tag: 'Zero Forgotten Gear',
    tagVariant: 'terracotta',
    description:
      'Coordinate shared and personal packing lists categorized by Clothing, Documents, Electronics, and Medical supplies with companion assignment.',
    icon: Luggage,
    link: '/trips',
    actionText: 'Organize Packing',
  },
  {
    id: 'upi-settlements',
    title: 'UPI & Razorpay Settlements',
    category: 'Payments',
    tag: 'Instant Settle',
    tagVariant: 'forest',
    description:
      'Record offline UPI settlements (GPay, PhonePe, Paytm, BHIM) or complete secure test-mode online payments with verified transaction receipts.',
    icon: IndianRupee,
    link: '/trips',
    actionText: 'Settle Debts',
  },
  {
    id: 'notifications-stream',
    title: 'Activity Stream & Reminders',
    category: 'Updates',
    tag: 'Instant Alerts',
    tagVariant: 'neutral',
    description:
      'Stay in sync with real-time in-app activity feeds and automated balance reminders so no companion is left wondering about trip updates.',
    icon: Bell,
    link: '/notifications',
    actionText: 'Stay Updated',
  },
];

// D. How TripTally Works: The 4-Step Workflow
const howItWorksSteps = [
  {
    step: '01',
    title: 'Create Your Trip',
    description: 'Select your destination, travel dates, and budget in Indian Rupees (₹). Pick authentic cover photography or upload your own.',
    icon: Compass,
    color: 'forest',
  },
  {
    step: '02',
    title: 'Plan Your Itinerary',
    description: 'Generate a personalised day-by-day plan with Gemini AI, or schedule activities, transit, and stays manually on an interactive map.',
    icon: Sparkles,
    color: 'terracotta',
  },
  {
    step: '03',
    title: 'Collaborate with Your Group',
    description: 'Invite travel companions via WhatsApp or email. Assign Editor or Viewer roles, coordinate packing lists, and vote on activities.',
    icon: Users,
    color: 'forest',
  },
  {
    step: '04',
    title: 'Manage Your Budget',
    description: 'Log receipts in ₹, split costs equitably, track category analytics, and settle outstanding balances easily with minimal transfers.',
    icon: Split,
    color: 'terracotta',
  },
];

// FAQs
const faqs = [
  {
    question: 'How does the Gemini AI Itinerary Generator work?',
    answer:
      'Our AI trip planner uses the Google Gemini API to craft customized day-by-day itineraries based on your destination, travel dates, budget in INR, group size, and travel style. You can review activities, timings, and estimated costs, and convert any AI plan into a collaborative trip board with a single click.',
  },
  {
    question: 'Is TripTally completely free to use for Indian travellers?',
    answer:
      'Yes. TripTally is 100% free for friends, families, and travel groups across India. You can create unlimited trips, invite companions, log expenses in Indian Rupees (₹), and build collaborative itineraries without subscription fees or hidden paywalls.',
  },
  {
    question: 'How does the debt simplification algorithm work for group trips?',
    answer:
      'In a typical group trip with 4 to 8 friends, everyone pays for different things (cabs, hotels, cafes, fuel, tickets). TripTally calculates net creditor and debtor balances and mathematically collapses the transactions to the minimum possible direct payments, so you settle with just 1 or 2 quick UPI transfers.',
  },
  {
    question: 'Can we pay settlements directly through UPI or Razorpay?',
    answer:
      'Yes! TripTally natively supports Indian Rupees (₹). You can record settlements via UPI (Google Pay, PhonePe, Paytm, BHIM) or initiate secure test-mode online payments through Razorpay integration.',
  },
  {
    question: 'How does the Smart Packing Checklist work for group trips?',
    answer:
      'The packing checklist lets you organize essentials by category—Documents, Clothing, Electronics, and Medical supplies. You can assign items to specific companions so group essentials like first-aid kits or cameras are never duplicated or forgotten.',
  },
  {
    question: 'Can I track trips on mobile while traveling on the road?',
    answer:
      'TripTally is fully responsive and touch-optimized. You can quickly log cab fares, roadside dhaba bills, or cottage deposits right from your phone with instant cloud synchronization.',
  },
];

export default function HomePage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [openFaq, setOpenFaq] = useState(0);

  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleOpenAuth = (mode = 'login') => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handlePlanDestination = (dest) => {
    if (isAuthenticated) {
      navigate('/trips');
    } else {
      toast.info('Start Your Trip', `Sign in to create your "${dest.name || dest.title}" trip board.`);
      handleOpenAuth('register');
    }
  };

  return (
    <div className="min-h-screen bg-ivory-50 text-charcoal-900 selection:bg-forest-100 selection:text-forest-900 overflow-x-hidden">
      
      {/* ---------------- 1. Hero Section: Collaborative India Trip Planner ---------------- */}
      <section className="relative pt-4 pb-10 lg:pt-6 lg:pb-14 overflow-hidden border-b border-ivory-200/70">
        
        {/* Subtle Decorative Background Glows */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-forest-100/35 via-terracotta-100/20 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -top-24 right-0 w-96 h-96 bg-forest-200/20 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            
            {/* Left Column: Required Headline & Copy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 flex flex-col items-start z-10 text-left"
            >
              {/* Small Subtle Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 border border-forest-200/80 text-forest-800 text-xs font-semibold mb-3.5 shadow-soft-sm">
                <Sparkles className="w-3.5 h-3.5 text-terracotta-500 animate-spin-slow" />
                <span>AI-Powered Travel Planner</span>
              </div>

              {/* Required Exact Headline */}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[44px] font-bold text-charcoal-900 leading-[1.12] tracking-tight mb-3">
                Plan Better Trips. <br />
                <span className="italic font-normal text-forest-700">Travel Together.</span>
              </h1>

              {/* Required Exact Supporting Text */}
              <p className="text-sm sm:text-base text-charcoal-600 leading-relaxed max-w-xl mb-5">
                Your AI-powered travel companion to create personalised itineraries, plan adventures with friends, and manage every rupee in one place.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mb-6">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate('/ai-trip-planner');
                    } else {
                      handleOpenAuth('register');
                    }
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto shadow-soft-lg"
                >
                  Plan Your Trip
                </Button>
                <a
                  href="#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center font-medium rounded-xl border border-ivory-300 hover:border-forest-600 bg-white hover:bg-ivory-100/70 text-charcoal-800 text-xs sm:text-sm px-4 py-2.5 transition-all duration-200 shadow-soft-sm gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-forest-600" />
                  Explore Features
                </a>
              </div>

              {/* Trust Highlights */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-ivory-200 w-full text-xs text-charcoal-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0" />
                  <span>Gemini AI Itinerary</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0" />
                  <span>Fair Split Ledger (₹)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0" />
                  <span>UPI & Settle Up</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Dynamic Interactive India Trip Workspace Showcase */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 relative flex items-center justify-center w-full"
            >
              <HeroTripShowcase onPlanTripClick={handlePlanDestination} />
            </motion.div>

          </div>
        </div>
      </section>

      {/* ---------------- Section A: Popular Destinations (India Centric) ---------------- */}
      <section id="destinations" className="py-20 bg-ivory-100/50 border-b border-ivory-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-terracotta-600 mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>Premier Indian Circuits</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900">
                Popular Destinations Across India
              </h2>
            </div>
            <p className="text-sm text-charcoal-600 max-w-md mt-3 md:mt-0 leading-relaxed">
              Explore handpicked domestic destinations with estimated budgets in ₹, ideal duration, and seamless trip planner integration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularDestinations.map((dest) => (
              <div
                key={dest.id}
                className="group bg-white rounded-2xl border border-ivory-200 overflow-hidden shadow-soft hover:shadow-soft-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={dest.image}
                    alt={dest.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/70 via-charcoal-900/20 to-transparent" />
                  
                  <div className="absolute top-3 left-3">
                    <Badge variant={dest.tagVariant}>{dest.tag}</Badge>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-xs font-medium text-ivory-200 uppercase tracking-wider">
                      {dest.state}
                    </p>
                    <h3 className="font-serif text-lg font-bold text-white drop-shadow-sm leading-tight">
                      {dest.name}
                    </h3>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-charcoal-600 mb-3 leading-relaxed line-clamp-2">
                      {dest.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-charcoal-600 mb-4 pb-3 border-b border-ivory-200">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-forest-600" />
                        {dest.duration}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-forest-800 text-sm">
                          {formatINR(dest.estBudget)}
                        </span>
                        <span className="text-[10px] text-charcoal-400 block">Est. budget</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlanDestination(dest)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="w-full justify-between hover:bg-forest-50 hover:text-forest-800 hover:border-forest-600 text-xs"
                  >
                    Plan this Trip
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-xs text-charcoal-500">
            * Budgets shown are estimated planning guidelines for groups of 2-5 travellers and subject to seasonal variability.
          </div>

        </div>
      </section>

      {/* ---------------- Section: Integrated Capabilities & Features ---------------- */}
      <section id="features" className="py-20 bg-ivory-50 border-b border-ivory-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Integrated Platform Capabilities</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-bold text-charcoal-900 mb-4 leading-tight">
              Built for How Indian Groups Actually Travel
            </h2>
            <p className="text-sm sm:text-base text-charcoal-600 leading-relaxed">
              From Gemini AI-generated day-by-day itineraries to fair rupee split ledgers, interactive maps, and smart packing, TripTally brings your entire journey under one collaborative roof.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {integratedFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-ivory-200/90 shadow-soft hover:shadow-soft-lg hover:border-forest-600/30 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                  onClick={() => {
                    if (feat.link === '/ai-trip-planner') {
                      if (isAuthenticated) {
                        navigate('/ai-trip-planner');
                      } else {
                        handleOpenAuth('register');
                      }
                    } else {
                      if (isAuthenticated) {
                        navigate(feat.link);
                      } else {
                        handleOpenAuth('register');
                      }
                    }
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-700 group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant={feat.tagVariant} size="sm">
                        {feat.tag}
                      </Badge>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-charcoal-900 mb-2 leading-snug">
                      {feat.title}
                    </h3>
                    
                    <p className="text-xs text-charcoal-600 leading-relaxed mb-4">
                      {feat.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-ivory-200/70 flex items-center justify-between text-xs">
                    <span className="font-semibold text-forest-700 group-hover:text-forest-900 transition-colors flex items-center gap-1">
                      {feat.actionText}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="text-[10px] text-charcoal-400 font-medium">
                      {feat.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ---------------- Section B: Plan Your Next Trip (Ready Templates) ---------------- */}
      <section className="py-20 bg-ivory-50 border-b border-ivory-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest-700 mb-2">
              <CompassIcon className="w-3.5 h-3.5" />
              <span>Ready-To-Customize Templates</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mb-4">
              Plan Your Next Trip in Minutes
            </h2>
            <p className="text-base text-charcoal-600 leading-relaxed">
              Start with a battle-tested Indian itinerary template with realistic budgets in rupees, transit plans, and day-by-day schedules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readyTripPlans.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl p-6 border border-ivory-200 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="forest">{trip.category}</Badge>
                    <span className="text-xs font-bold text-forest-700 font-mono">
                      {trip.duration}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-charcoal-900 mb-1">
                    {trip.title}
                  </h3>
                  <p className="text-xs text-charcoal-500 mb-4 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-terracotta-500 shrink-0" />
                    <span className="truncate">{trip.route}</span>
                  </p>

                  {/* Budget & Split Metric */}
                  <div className="p-3.5 rounded-xl bg-ivory-100/70 border border-ivory-200 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-charcoal-600">Total Group Budget:</span>
                      <strong className="text-charcoal-900 text-sm font-mono">{formatINR(trip.budget)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-charcoal-600">Estimated / Member ({trip.travelers}):</span>
                      <strong className="text-forest-700 text-xs font-mono">{formatINR(trip.perPerson)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-charcoal-500 pt-1 border-t border-ivory-200">
                      <span className="flex items-center gap-1">
                        <Car className="w-3 h-3 text-charcoal-400" />
                        {trip.transport}
                      </span>
                    </div>
                  </div>

                  {/* Highlights Bullet List */}
                  <div className="space-y-1.5 mb-6">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400 block mb-1">
                      Key Highlights:
                    </span>
                    {trip.highlights.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-charcoal-700">
                        <Check className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handlePlanDestination(trip)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="w-full justify-between"
                >
                  Customize This Itinerary
                </Button>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ---------------- Section C: How TripTally Works ---------------- */}
      <section id="how-it-works" className="py-20 bg-ivory-100/40 border-b border-ivory-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest-700 mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Simple 4-Step Workflow</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mb-4">
              How TripTally Works for Indian Groups
            </h2>
            <p className="text-base text-charcoal-600 leading-relaxed">
              No more messy WhatsApp messages, lost payment screenshots, or conflicting notes. TripTally keeps every friend on the exact same page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksSteps.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="bg-white rounded-2xl p-6 border border-ivory-200 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-terracotta-600 mb-3 block">
                      STEP {item.step}
                    </span>
                    <div className="w-11 h-11 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-700 mb-3">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-base font-bold text-charcoal-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-charcoal-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ---------------- Sections D, E, F: Interactive Product Preview Workspace ---------------- */}
      <section id="preview" className="py-20 bg-ivory-50 border-b border-ivory-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Interactive Live Preview</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mb-4">
              Explore a Live Trip Board (Manali 5-Day Circuit)
            </h2>
            <p className="text-base text-charcoal-600 leading-relaxed">
              Test out the collaborative day-by-day itinerary, expense splitting with UPI settlement, and budget analytics below.
            </p>
          </div>

          {/* Embedded Interactive ProductPreview Component with Indian Manali Data */}
          <div className="bg-white rounded-3xl border border-ivory-200/90 shadow-soft-xl p-3 sm:p-6">
            <ProductPreview />
          </div>

        </div>
      </section>

      {/* ---------------- Section G: FAQ & Final Call to Action ---------------- */}
      <section id="faq" className="py-20 bg-ivory-100/30 border-b border-ivory-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest-700 mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Got Questions?</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-charcoal-600">
              Everything you need to know about planning trips and managing rupees with TripTally.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={faq.question}
                className="bg-white rounded-2xl border border-ivory-200/90 overflow-hidden shadow-soft-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
                >
                  <span className="font-serif text-base font-bold text-charcoal-900">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-forest-700 shrink-0 transition-transform duration-300 ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-charcoal-600 leading-relaxed border-t border-ivory-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 bg-ivory-50 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="rounded-3xl bg-forest-900 text-ivory-50 p-8 sm:p-14 text-center relative overflow-hidden shadow-soft-xl border border-forest-800">
            <div className="absolute top-0 right-0 w-80 h-80 bg-forest-700/20 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-terracotta-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-800/80 border border-forest-700 text-forest-200 text-xs font-semibold mb-6">
                <Globe2 className="w-3.5 h-3.5 text-terracotta-400" />
                <span>Ready for takeoff across India</span>
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ivory-100 mb-6 leading-tight">
                Your Next Trip Starts Here.
              </h2>

              <p className="text-sm sm:text-base text-forest-100/90 mb-8 leading-relaxed max-w-xl mx-auto">
                Plan smarter, travel together, and keep every part of your journey organised.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="accent"
                  size="lg"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate('/ai-trip-planner');
                    } else {
                      handleOpenAuth('register');
                    }
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="shadow-soft"
                >
                  Start Planning
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate('/ai-trip-planner');
                    } else {
                      handleOpenAuth('login');
                    }
                  }}
                  className="bg-forest-800/60 hover:bg-forest-800 text-ivory-100 border-forest-700 hover:border-forest-600"
                >
                  Explore AI Planner
                </Button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ---------------- Authentication Modal ---------------- */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

    </div>
  );
}

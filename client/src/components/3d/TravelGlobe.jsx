import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  MapPin,
  Sparkles,
  ArrowRight,
  Compass,
  X,
  RotateCw
} from 'lucide-react';
import { DESTINATIONS } from './worldData';
import GlobeScene from './GlobeScene';

/**
 * Checks whether the client browser supports WebGL.
 */
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

/**
 * Fallback component when WebGL is unsupported or disabled.
 */
function WebGLFallback({ onSelectDestination, selectedDest }) {
  return (
    <div className="relative w-full h-[520px] rounded-3xl bg-[#03130E] border border-forest-800 p-6 flex flex-col items-center justify-center text-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(82,183,136,0.15)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="w-20 h-20 rounded-full bg-forest-900 border border-forest-700/60 flex items-center justify-center text-forest-300 mb-4 shadow-soft">
        <Compass className="w-10 h-10 text-emerald-400 animate-spin-slow" />
      </div>

      <h3 className="font-serif text-xl font-medium text-ivory-100 mb-2">
        Incredible India & Travel Destinations
      </h3>
      <p className="text-xs text-forest-200/80 max-w-sm mb-6 leading-relaxed">
        Explore premier hill stations, coastal retreats, and heritage circuits planned with TripTally.
      </p>

      {/* Destination Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
        {DESTINATIONS.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelectDestination(d)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedDest?.id === d.id
                ? 'bg-terracotta-500 text-white shadow-soft'
                : 'bg-forest-900/80 hover:bg-forest-800 text-forest-100 border border-forest-700/50'
            }`}
          >
            {d.name}, {d.region || d.country}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TravelGlobe({ onPlanTripClick }) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [selectedDest, setSelectedDest] = useState(null);
  const [hoveredDest, setHoveredDest] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasWebGL(isWebGLAvailable());

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const activeDest = hoveredDest || selectedDest;

  // Key quick-pick destinations for the top chips bar
  const quickPicks = [
    { id: 'manali', label: '🏔️ Manali' },
    { id: 'goa', label: '🏖️ Goa' },
    { id: 'kashmir', label: '❄️ Kashmir' },
    { id: 'jaipur', label: '🏰 Jaipur' },
    { id: 'kerala', label: '🌴 Kerala' },
  ];

  const handleQuickPick = (pickId) => {
    const dest = DESTINATIONS.find((d) => d.id === pickId);
    if (dest) {
      setSelectedDest(dest);
    }
  };

  return (
    <div className="relative w-full h-[520px] sm:h-[580px] lg:h-[620px] flex items-center justify-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#04140D] via-[#020A06] to-[#030E08] border border-emerald-500/25 shadow-[0_25px_60px_-15px_rgba(2,18,12,0.8)]">
      
      {/* Ambient Radial Glow Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(52,211,153,0.16)_0%,rgba(16,48,35,0.06)_50%,transparent_75%)] pointer-events-none" />

      {/* Top HUD Status & Quick Pick Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Live Radar Tag */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#03150F]/85 backdrop-blur-md border border-emerald-500/30 text-white shadow-soft">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            3D India Radar
          </span>
          <span className="text-[10px] text-ivory-300/60 hidden sm:inline">
            • Live Routes
          </span>
        </div>

        {/* Quick Destination Chips */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-1.5 bg-[#03150F]/75 backdrop-blur-md p-1 rounded-full border border-forest-700/50 shadow-soft">
          {quickPicks.map((pick) => {
            const isCurrent = activeDest?.id === pick.id;
            return (
              <button
                key={pick.id}
                onClick={() => handleQuickPick(pick.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  isCurrent
                    ? 'bg-terracotta-500 text-white shadow-soft font-semibold'
                    : 'text-ivory-200/80 hover:text-white hover:bg-forest-800/60'
                }`}
              >
                {pick.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      {hasWebGL ? (
        <div className="w-full h-full cursor-grab active:cursor-grabbing" style={{ touchAction: 'pan-y' }}>
          <Canvas
            camera={{ position: [0, 0, 5.8], fov: 42 }}
            dpr={[1, 2]}
            onCreated={() => setIsLoaded(true)}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              alpha: true,
            }}
          >
            <Suspense fallback={null}>
              <GlobeScene
                selectedDestId={activeDest?.id}
                onSelectDestination={(dest) => {
                  setSelectedDest(dest);
                }}
                onHoverDestination={(dest) => {
                  setHoveredDest(dest);
                }}
                prefersReducedMotion={prefersReducedMotion}
              />
            </Suspense>
          </Canvas>
        </div>
      ) : (
        <WebGLFallback
          onSelectDestination={setSelectedDest}
          selectedDest={selectedDest}
        />
      )}

      {/* Floating Interactive Destination Preview Card (Visible on Hover/Click) */}
      {activeDest ? (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 max-w-sm z-30 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto">
          <div className="bg-[#03150F]/95 text-white backdrop-blur-2xl border border-emerald-400/60 rounded-2xl p-3.5 shadow-[0_20px_45px_rgba(0,0,0,0.85)] flex items-center gap-3.5 hover:border-terracotta-400 transition-all">
            <img
              src={activeDest.image}
              alt={activeDest.name}
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-emerald-400/30 shadow-soft"
              onError={(e) => {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=400&q=80';
              }}
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <h4 className="font-serif text-sm font-bold text-white truncate">
                  {activeDest.name}
                </h4>
              </div>
              <p className="text-[11px] text-emerald-300 truncate">
                {activeDest.region || activeDest.country} • <span className="font-mono font-bold text-terracotta-300">{activeDest.avgBudget?.split(' ')[0] || activeDest.avgBudget}</span>
              </p>
              <button
                onClick={() => {
                  if (onPlanTripClick) onPlanTripClick(activeDest);
                }}
                className="text-[11px] font-bold text-ivory-100 hover:text-emerald-300 inline-flex items-center gap-1 mt-1 group"
              >
                Plan this trip <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <button
              onClick={() => {
                setSelectedDest(null);
                setHoveredDest(null);
              }}
              className="text-ivory-400 hover:text-white p-1 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Bottom Helper Instruction Hint */
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#03150F]/80 backdrop-blur-md border border-forest-700/50 text-xs text-ivory-200/90 shadow-soft pointer-events-none whitespace-nowrap">
          <RotateCw className="w-3 h-3 text-emerald-400 animate-spin-slow" />
          <span>Hover pins for place names & cost • Drag to rotate</span>
        </div>
      )}

    </div>
  );
}

export default TravelGlobe;

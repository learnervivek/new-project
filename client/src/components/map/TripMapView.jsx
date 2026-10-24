import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Compass,
  Navigation,
  Calendar,
  Clock,
  Maximize2,
  RotateCcw,
  Layers,
  Utensils,
  Camera,
  Hotel,
  Car,
  Sparkles,
  Info,
  ChevronRight,
  X
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import tripService from '../../services/tripService';
import { formatCurrency } from '../../lib/utils';

// Category icon SVGs & colors for Leaflet divIcons
const categoryConfig = {
  sightseeing: {
    label: 'Sightseeing',
    bg: '#7C3AED', // violet-600
    border: '#6D28D9',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  },
  restaurant: {
    label: 'Dining',
    bg: '#E07A5F', // terracotta
    border: '#C85A3D',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10"/><path d="M12 15v7"/><path d="M6 2v20"/></svg>`,
  },
  accommodation: {
    label: 'Stay',
    bg: '#D97706', // amber-600
    border: '#B45309',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 11h.01"/><path d="M15 7h.01"/><path d="M16 16h4a2 2 0 0 0 2-2V9.5a2 2 0 0 0-.7-1.54l-6.42-5.46a2 2 0 0 0-2.56 0L5.9 7.96A2 2 0 0 0 5.2 9.5V14a2 2 0 0 0 2 2h4"/><path d="M9 11h.01"/><path d="M9 7h.01"/></svg>`,
  },
  transportation: {
    label: 'Transit',
    bg: '#2563EB', // blue-600
    border: '#1D4ED8',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
  },
  activity: {
    label: 'Activity',
    bg: '#1B4332', // forest-800
    border: '#143326',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
  },
};

export function TripMapView({ trip, items = [], onSwitchToList, onAddActivity }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLineRef = useRef(null);

  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRoute, setShowRoute] = useState(true);
  const [geocodedDestination, setGeocodedDestination] = useState(
    trip?.coordinates?.lat && trip?.coordinates?.lng ? trip.coordinates : null
  );

  // Validate destination coordinates
  const validDestination = useMemo(() => {
    if (
      geocodedDestination &&
      typeof geocodedDestination.lat === 'number' &&
      typeof geocodedDestination.lng === 'number' &&
      !isNaN(geocodedDestination.lat) &&
      !isNaN(geocodedDestination.lng)
    ) {
      return geocodedDestination;
    }
    return null;
  }, [geocodedDestination]);

  // Attempt geocoding trip destination if coordinates are missing
  useEffect(() => {
    if (!validDestination && trip?.destination) {
      tripService.geocode(trip.destination)
        .then((res) => {
          if (res?.success && res.result && typeof res.result.lat === 'number' && typeof res.result.lng === 'number') {
            setGeocodedDestination(res.result);
          }
        })
        .catch(() => {});
    }
  }, [trip?.destination, validDestination]);

  // Extract unique days from items
  const uniqueDays = useMemo(() => {
    const dates = Array.from(
      new Set(items.map((i) => new Date(i.date).toISOString().split('T')[0]))
    ).sort();
    return dates;
  }, [items]);

  // Filter items by selected day and ensure valid coordinates
  const plottableItems = useMemo(() => {
    return items.filter((item) => {
      // Must have valid lat and lng
      if (
        !item?.coordinates ||
        typeof item.coordinates.lat !== 'number' ||
        typeof item.coordinates.lng !== 'number' ||
        isNaN(item.coordinates.lat) ||
        isNaN(item.coordinates.lng)
      ) {
        return false;
      }

      if (selectedDay !== 'all') {
        const itemDateStr = new Date(item.date).toISOString().split('T')[0];
        if (itemDateStr !== selectedDay) return false;
      }

      return true;
    });
  }, [items, selectedDay]);

  const itemsWithoutCoordinates = useMemo(() => {
    return items.filter(
      (item) =>
        !item?.coordinates ||
        typeof item.coordinates.lat !== 'number' ||
        typeof item.coordinates.lng !== 'number' ||
        isNaN(item.coordinates.lat) ||
        isNaN(item.coordinates.lng)
    );
  }, [items]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Reset previous leaflet container ID if present from remounting
    if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
      delete mapContainerRef.current._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      const initialLat = validDestination?.lat ?? 20;
      const initialLng = validDestination?.lng ?? 0;
      const initialZoom = validDestination ? 12 : 2;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        attributionControl: false,
      });

      // Free OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Attribution control in bottom-right
      L.control.attribution({ position: 'bottomright' }).addTo(map);

      // Create layers for markers and routes
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch (e) {}
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        delete mapContainerRef.current._leaflet_id;
      }
    };
  }, []);

  // Update markers, popups, and route lines whenever items, selectedDay, or destination changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (routeLineRef.current) {
      try {
        map.removeLayer(routeLineRef.current);
      } catch (e) {}
      routeLineRef.current = null;
    }

    const bounds = L.latLngBounds();
    const routeCoords = [];

    // 1. Destination anchor marker (if trip destination is geocoded)
    if (validDestination) {
      const destLatLng = [validDestination.lat, validDestination.lng];
      bounds.extend(destLatLng);

      const destIcon = L.divIcon({
        className: 'custom-map-dest-icon',
        html: `
          <div style="background-color: #1B4332; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2.5px solid white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const destMarker = L.marker(destLatLng, { icon: destIcon }).addTo(markersLayer);
      destMarker.bindTooltip(`<strong>Trip Destination:</strong> ${trip?.destination || 'Destination'}`, {
        direction: 'top',
        className: 'custom-map-tooltip',
      });
    }

    // 2. Plot activities
    plottableItems.forEach((item, index) => {
      const { lat, lng } = item.coordinates;
      const latLng = [lat, lng];
      bounds.extend(latLng);
      routeCoords.push(latLng);

      const config = categoryConfig[item.category] || categoryConfig.activity;

      // Custom marker icon with stop number
      const markerIcon = L.divIcon({
        className: 'custom-map-activity-icon',
        html: `
          <div style="position: relative; cursor: pointer; transition: transform 0.2s;">
            <div style="background-color: ${config.bg}; width: 32px; height: 32px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid white;">
              ${config.svg}
            </div>
            <span style="position: absolute; top: -6px; right: -6px; background-color: #1E293B; color: white; font-size: 10px; font-weight: bold; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1.5px solid white;">
              ${index + 1}
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(latLng, { icon: markerIcon }).addTo(markersLayer);

      // Tooltip on hover
      marker.bindTooltip(
        `<div style="font-family: inherit;"><strong>#${index + 1} ${item.title}</strong><br/><span style="font-size: 11px; color: #64748B;">${item.location || config.label}</span></div>`,
        { direction: 'top', className: 'custom-map-tooltip' }
      );

      // Click opens details card
      marker.on('click', () => {
        setSelectedItem(item);
        try {
          map.panTo(latLng, { animate: true, duration: 0.5 });
        } catch (e) {}
      });
    });

    // 3. Draw simple sequential route lines between stops
    if (showRoute && routeCoords.length > 1) {
      const polyline = L.polyline(routeCoords, {
        color: '#1B4332',
        weight: 3.5,
        opacity: 0.75,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polyline.bindTooltip('Sequential itinerary path between stops (direct travel line)', {
        sticky: true,
      });

      routeLineRef.current = polyline;
    }

    // Fit map bounds to encompass all plotted points safely
    if (bounds.isValid()) {
      try {
        const size = map.getSize();
        if (size.x > 0 && size.y > 0) {
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15,
            animate: false,
          });
        }
      } catch (e) {
        console.warn('fitBounds warning:', e);
      }
    }
  }, [plottableItems, validDestination, showRoute, trip?.destination]);

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds();
    if (validDestination) {
      bounds.extend([validDestination.lat, validDestination.lng]);
    }
    plottableItems.forEach((item) => {
      if (item.coordinates?.lat && item.coordinates?.lng) {
        bounds.extend([item.coordinates.lat, item.coordinates.lng]);
      }
    });

    if (bounds.isValid()) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      } catch (e) {}
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Map Control Bar */}
      <div className="p-3 rounded-2xl bg-white border border-ivory-300 shadow-soft-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Day Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setSelectedDay('all');
              setSelectedItem(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedDay === 'all'
                ? 'bg-forest-800 text-white shadow-soft-sm'
                : 'text-charcoal-600 hover:bg-ivory-100'
            }`}
          >
            All Stops ({plottableItems.length})
          </button>

          {uniqueDays.map((dayStr, idx) => {
            const isSelected = selectedDay === dayStr;
            const dateObj = new Date(dayStr);
            const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return (
              <button
                key={dayStr}
                type="button"
                onClick={() => {
                  setSelectedDay(dayStr);
                  setSelectedItem(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-forest-800 text-white shadow-soft-sm'
                    : 'text-charcoal-600 hover:bg-ivory-100'
                }`}
              >
                Day {idx + 1} ({label})
              </button>
            );
          })}
        </div>

        {/* View Options & Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {/* Toggle Route Line */}
          <button
            type="button"
            onClick={() => setShowRoute((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              showRoute
                ? 'bg-forest-50 text-forest-800 border-forest-300'
                : 'bg-white text-charcoal-500 border-ivory-300 hover:bg-ivory-50'
            }`}
            title="Toggle sequential itinerary connection lines"
          >
            <Navigation className="w-3.5 h-3.5 text-forest-600" />
            <span className="hidden sm:inline">Path Lines</span>
          </button>

          {/* Reset View Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            title="Fit map to all stops"
          >
            Reset View
          </Button>

          {/* Switch to List View */}
          {onSwitchToList && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSwitchToList}
              leftIcon={<Compass className="w-3.5 h-3.5" />}
            >
              List View
            </Button>
          )}
        </div>
      </div>

      {/* Main Map Box & Details Overlay */}
      <div className="relative rounded-3xl overflow-hidden border border-ivory-300 shadow-soft-lg bg-ivory-100">
        
        {/* Leaflet Map DOM Element */}
        <div
          ref={mapContainerRef}
          className="w-full h-[450px] sm:h-[550px] z-0 focus:outline-none"
        />

        {/* Disclaimer Note Badge */}
        <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
          <div className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md border border-ivory-300 text-[10px] text-charcoal-600 shadow-soft-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-forest-600 shrink-0" />
            <span>OpenStreetMap • Direct sequence lines (not road turn-by-turn)</span>
          </div>
        </div>

        {/* Missing Coordinates Warning Banner (if some activities lack coordinates) */}
        {itemsWithoutCoordinates.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[1000]">
            <div className="px-3 py-1.5 rounded-xl bg-amber-50/95 backdrop-blur-md border border-amber-200 text-amber-900 text-xs shadow-soft flex items-center justify-between sm:justify-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                {itemsWithoutCoordinates.length} {itemsWithoutCoordinates.length === 1 ? 'activity is' : 'activities are'} missing verified location coordinates.
              </span>
            </div>
          </div>
        )}

        {/* Selected Activity Detail Popup Card */}
        {selectedItem && (
          <div className="absolute top-12 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:w-80 z-[1001] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 rounded-2xl bg-white border border-ivory-300 shadow-soft-xl space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700 bg-forest-50 px-2 py-0.5 rounded-md border border-forest-200">
                  {selectedItem.category}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-900 hover:bg-ivory-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-charcoal-900 font-display">
                  {selectedItem.title}
                </h4>
                {selectedItem.location && (
                  <p className="text-xs text-charcoal-500 flex items-center gap-1 mt-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-terracotta-500 shrink-0" />
                    <span className="truncate">{selectedItem.location}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-charcoal-600 pt-1 border-t border-ivory-200">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-forest-600" />
                  {new Date(selectedItem.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {selectedItem.startTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-forest-600" />
                    {selectedItem.startTime}
                  </span>
                )}
                {selectedItem.estimatedCost > 0 && (
                  <span className="font-mono font-bold text-forest-800 ml-auto">
                    {formatCurrency(selectedItem.estimatedCost, trip?.currency || 'INR')}
                  </span>
                )}
              </div>

              {selectedItem.notes && (
                <p className="text-xs text-charcoal-600 bg-ivory-50 p-2.5 rounded-xl border border-ivory-200 leading-relaxed max-h-24 overflow-y-auto">
                  {selectedItem.notes}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty State Overlay when 0 items have coordinates and destination is not geocoded */}
        {plottableItems.length === 0 && !validDestination && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[1002] flex items-center justify-center p-6 text-center">
            <EmptyState
              icon={MapPin}
              title="No Plottable Map Locations Yet"
              description="Add itinerary stops with valid venue names or addresses (e.g. 'Colosseum, Rome' or 'Eiffel Tower, Paris') to view them on the interactive map."
              actionLabel={onAddActivity ? 'Schedule Activity with Location' : undefined}
              onAction={onAddActivity}
            />
          </div>
        )}

      </div>

    </div>
  );
}

export default TripMapView;

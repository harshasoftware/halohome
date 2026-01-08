/**
 * ScoutPanel Component
 * Displays scouted locations by life category with filtering
 *
 * Redesigned with glass morphism aesthetic matching the landing page
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MapPin, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Filter,
  Globe2, Trophy, List, LayoutGrid, Briefcase, Heart, Activity, Home,
  Sparkles, DollarSign, Info, Navigation, Star, Lock, Mail, Check, Building2
} from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { cn } from '@/lib/utils';
import type { PlanetaryLine, AspectLine } from '@/lib/astro-types';
import { useScoutStore } from '@/stores/scoutStore';
import { useIsRealUser, useAuthUser } from '@/stores/authStore';
import { useAuthActions } from '@/hooks/useAuthSync';
import { useGoogleOneTap } from '@/hooks/useGoogleOneTap';
import { useAISubscription } from '../ai/useAISubscription';
import { supabase } from '@/integrations/supabase/client';
import { useVirtualList } from '@/hooks/useVirtualList';
import { VirtualListContainer } from '@/components/ui/virtual-list-container';
import {
  SIGNUP_PROMPT_ITEM_HEIGHT,
  BLURRED_OVERALL_ITEM_HEIGHT,
  OVERALL_CARD_ITEM_HEIGHT,
  SCOUT_LIST_PADDING,
  SCOUT_LIST_VIRTUALIZATION_CONFIG,
} from './scout-panel-heights';

// Lucide icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  career: Briefcase,
  love: Heart,
  health: Activity,
  home: Home,
  wellbeing: Sparkles,
  wealth: DollarSign,
  overall: LayoutGrid,
};

// Category-specific colors for visual distinction
const CATEGORY_COLORS: Record<string, {
  selected: string;
  unselected: string;
  icon: string;
}> = {
  overall: {
    selected: 'bg-slate-700 dark:bg-white/15 border-slate-600 dark:border-white/30 text-white',
    unselected: 'bg-slate-100 dark:bg-white/[0.03] border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.06]',
    icon: 'text-slate-500 dark:text-slate-400',
  },
  career: {
    selected: 'bg-blue-600 dark:bg-blue-500/30 border-blue-500 dark:border-blue-400/50 text-white',
    unselected: 'bg-blue-50 dark:bg-blue-500/[0.08] border-blue-200 dark:border-blue-400/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/[0.15]',
    icon: 'text-blue-500 dark:text-blue-400',
  },
  love: {
    selected: 'bg-pink-500 dark:bg-pink-500/30 border-pink-400 dark:border-pink-400/50 text-white',
    unselected: 'bg-pink-50 dark:bg-pink-500/[0.08] border-pink-200 dark:border-pink-400/20 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-500/[0.15]',
    icon: 'text-pink-500 dark:text-pink-400',
  },
  health: {
    selected: 'bg-green-600 dark:bg-green-500/30 border-green-500 dark:border-green-400/50 text-white',
    unselected: 'bg-green-50 dark:bg-green-500/[0.08] border-green-200 dark:border-green-400/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/[0.15]',
    icon: 'text-green-500 dark:text-green-400',
  },
  home: {
    selected: 'bg-amber-500 dark:bg-amber-500/30 border-amber-400 dark:border-amber-400/50 text-white',
    unselected: 'bg-amber-50 dark:bg-amber-500/[0.08] border-amber-200 dark:border-amber-400/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/[0.15]',
    icon: 'text-amber-500 dark:text-amber-400',
  },
  wellbeing: {
    selected: 'bg-purple-500 dark:bg-purple-500/30 border-purple-400 dark:border-purple-400/50 text-white',
    unselected: 'bg-purple-50 dark:bg-purple-500/[0.08] border-purple-200 dark:border-purple-400/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/[0.15]',
    icon: 'text-purple-500 dark:text-purple-400',
  },
  wealth: {
    selected: 'bg-emerald-600 dark:bg-emerald-500/30 border-emerald-500 dark:border-emerald-400/50 text-white',
    unselected: 'bg-emerald-50 dark:bg-emerald-500/[0.08] border-emerald-200 dark:border-emerald-400/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/[0.15]',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
};

// ISO 3166-1 alpha-2 code to full country name mapping
const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia',
  'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'PT': 'Portugal',
  'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria',
  'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland', 'IS': 'Iceland',
  'IE': 'Ireland', 'PL': 'Poland', 'CZ': 'Czech Republic', 'HU': 'Hungary',
  'GR': 'Greece', 'TR': 'Turkey', 'RU': 'Russia', 'UA': 'Ukraine',
  'JP': 'Japan', 'KR': 'South Korea', 'CN': 'China', 'TW': 'Taiwan', 'HK': 'Hong Kong',
  'IN': 'India', 'TH': 'Thailand', 'VN': 'Vietnam', 'ID': 'Indonesia', 'PH': 'Philippines',
  'SG': 'Singapore', 'MY': 'Malaysia', 'NZ': 'New Zealand',
  'MX': 'Mexico', 'BR': 'Brazil', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia',
  'PE': 'Peru', 'VE': 'Venezuela', 'EC': 'Ecuador', 'UY': 'Uruguay',
  'ZA': 'South Africa', 'EG': 'Egypt', 'MA': 'Morocco', 'NG': 'Nigeria', 'KE': 'Kenya',
  'IL': 'Israel', 'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia', 'QA': 'Qatar',
  'RO': 'Romania', 'BG': 'Bulgaria', 'HR': 'Croatia', 'SI': 'Slovenia', 'RS': 'Serbia',
  'SK': 'Slovakia', 'LT': 'Lithuania', 'LV': 'Latvia', 'EE': 'Estonia',
  'LU': 'Luxembourg', 'MT': 'Malta', 'CY': 'Cyprus', 'MC': 'Monaco',
  'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'NP': 'Nepal', 'MM': 'Myanmar',
  'KH': 'Cambodia', 'LA': 'Laos', 'AF': 'Afghanistan', 'IQ': 'Iraq', 'IR': 'Iran',
  'SY': 'Syria', 'JO': 'Jordan', 'LB': 'Lebanon', 'KW': 'Kuwait', 'BH': 'Bahrain',
  'OM': 'Oman', 'YE': 'Yemen', 'PS': 'Palestine', 'GE': 'Georgia', 'AM': 'Armenia',
  'AZ': 'Azerbaijan', 'KZ': 'Kazakhstan', 'UZ': 'Uzbekistan', 'TM': 'Turkmenistan',
  'TJ': 'Tajikistan', 'KG': 'Kyrgyzstan', 'MN': 'Mongolia',
  'BO': 'Bolivia', 'PY': 'Paraguay', 'GY': 'Guyana', 'SR': 'Suriname',
  'PA': 'Panama', 'CR': 'Costa Rica', 'NI': 'Nicaragua', 'HN': 'Honduras',
  'SV': 'El Salvador', 'GT': 'Guatemala', 'BZ': 'Belize', 'CU': 'Cuba',
  'DO': 'Dominican Republic', 'HT': 'Haiti', 'JM': 'Jamaica', 'TT': 'Trinidad and Tobago',
  'PR': 'Puerto Rico', 'DZ': 'Algeria', 'TN': 'Tunisia', 'LY': 'Libya', 'SD': 'Sudan',
  'ET': 'Ethiopia', 'GH': 'Ghana', 'CI': 'Ivory Coast', 'SN': 'Senegal', 'CM': 'Cameroon',
  'UG': 'Uganda', 'TZ': 'Tanzania', 'ZW': 'Zimbabwe', 'ZM': 'Zambia', 'MW': 'Malawi',
  'MZ': 'Mozambique', 'AO': 'Angola', 'CD': 'DR Congo', 'CG': 'Congo', 'RW': 'Rwanda',
  'BY': 'Belarus', 'MD': 'Moldova', 'BA': 'Bosnia', 'ME': 'Montenegro', 'MK': 'North Macedonia',
  'AL': 'Albania', 'XK': 'Kosovo', 'LI': 'Liechtenstein', 'AD': 'Andorra', 'SM': 'San Marino',
  'VA': 'Vatican City', 'FO': 'Faroe Islands', 'GL': 'Greenland',
  'BN': 'Brunei', 'MO': 'Macau', 'NC': 'New Caledonia', 'FJ': 'Fiji', 'PG': 'Papua New Guinea',
};

// Country name to ISO code (reverse mapping for backward compatibility)
const COUNTRY_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name, code])
);

// Get full country name from ISO code
const getCountryName = (countryCode: string): string => {
  return COUNTRY_NAMES[countryCode] || countryCode;
};

// Convert country code or name to flag emoji
const getCountryFlag = (countryOrCode: string): string => {
  // Check if it's already a 2-letter code
  const code = countryOrCode.length === 2 ? countryOrCode : COUNTRY_CODES[countryOrCode];
  if (!code) return '';
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65))
    .join('');
};

import {
  type ScoutCategory,
  type ScoutAnalysis,
  type ScoutLocation,
  type CountryGroup,
  type RankedCountryGroup,
  type OverallScoutLocation,
  type OverallCountryGroup,
  SCOUT_CATEGORIES,
  CATEGORY_INFO,
  scoutLocationsForCategory,
  scoutOverallLocations,
  getCountriesFromAnalysis,
  filterAnalysisByCountry,
  getPlainLanguageInfluence,
  groupOverallByCountry,
  rankCountriesByScore,
} from '../utils/scout-utils';
import {
  type PopulationTier,
  POPULATION_TIERS,
  POPULATION_TIER_ORDER,
} from '../utils/population-tiers';

export interface ScoutMarker {
  lat: number;
  lng: number;
  name: string;
  nature: 'beneficial' | 'challenging';
}

interface ScoutPanelProps {
  planetaryLines: PlanetaryLine[];
  aspectLines: AspectLine[];
  onCityClick?: (lat: number, lng: number, cityName: string) => void;
  onShowCountryMarkers?: (markers: ScoutMarker[]) => void;
  onClose?: () => void;
}

type ViewFilter = 'beneficial' | 'challenging';
type ViewMode = 'top' | 'countries';
type SelectedTab = 'overall' | ScoutCategory;

// Number of locations to show before requiring signup
const FREE_LOCATION_LIMIT = 5;
// Number of blurred placeholder locations to show as preview
const BLURRED_PREVIEW_COUNT = 3;
// Minimum locations to show (floor)
const MIN_RANKED_LOCATIONS = 200;
// Percentage of top cities to show
const TOP_PERCENTAGE = 0.05;

// Calculate location limit: top 5% of cities, but minimum 200
const getLocationLimit = (totalCities: number): number => {
  const fivePercent = Math.ceil(totalCities * TOP_PERCENTAGE);
  return Math.max(fivePercent, MIN_RANKED_LOCATIONS);
};

// Fake city names for blurred preview (hack-proof - not real data)
const FAKE_CITIES = [
  { name: 'Aurelia Springs', country: 'Novaria' },
  { name: 'Crystalline Bay', country: 'Veridian' },
  { name: 'Emberstone Valley', country: 'Solanthia' },
  { name: 'Moonhaven Ridge', country: 'Celestine' },
  { name: 'Starfall Harbor', country: 'Luminara' },
];

// ============================================================================
// Virtual List Item Types for Overall Top Locations
// ============================================================================

/**
 * Discriminated union for items in the virtualized Overall Top Locations list.
 * Each type has a different height for accurate virtualization.
 */
type OverallVirtualItem =
  | { type: 'signupPrompt'; remainingCount: number }
  | { type: 'blurredOverall'; fakeCity: { name: string; country: string }; rank: number }
  | { type: 'overallLocation'; location: OverallScoutLocation; rank: number };

/**
 * Get the height of an Overall virtual item (including gap spacing).
 */
function getOverallVirtualItemHeight(item: OverallVirtualItem): number {
  switch (item.type) {
    case 'signupPrompt':
      return SIGNUP_PROMPT_ITEM_HEIGHT;
    case 'blurredOverall':
      return BLURRED_OVERALL_ITEM_HEIGHT;
    case 'overallLocation':
      return OVERALL_CARD_ITEM_HEIGHT;
  }
}

export const ScoutPanel: React.FC<ScoutPanelProps> = ({
  planetaryLines,
  aspectLines,
  onCityClick,
  onShowCountryMarkers,
}) => {
  const [selectedTab, setSelectedTab] = useState<SelectedTab>('overall');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('beneficial');
  const [viewMode, setViewMode] = useState<ViewMode>('top');
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

  // Auth check for gating top locations (excludes anonymous users)
  const isAuthenticated = useIsRealUser();

  // Subscription check for gating categories
  const { status: subscriptionStatus } = useAISubscription();
  const isPaidUser = subscriptionStatus?.planType === 'starter' ||
                     subscriptionStatus?.planType === 'pro' ||
                     subscriptionStatus?.planType === 'credits';

  // State for showing upgrade modal when clicking locked categories
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Mobile description toast - shows briefly when tab is tapped
  const [mobileToast, setMobileToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll container refs for virtualized lists
  const overallTopScrollRef = useRef<HTMLDivElement>(null);

  const showMobileToast = useCallback((description: string) => {
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setMobileToast(description);
    // Auto-hide after 2.5 seconds
    toastTimeoutRef.current = setTimeout(() => {
      setMobileToast(null);
    }, 2500);
  }, []);

  // --- Scout results from store (computed by worker pool in GlobePage) ---
  // Results are pre-computed at the page level so they persist even when this panel closes.
  // The worker pool runs in parallel across all categories for fast computation.
  const scoutProgress = useScoutStore((state) => state.progress);
  const storeOverallResults = useScoutStore((state) => state.overallResults);
  const storeCategoryResults = useScoutStore((state) => state.categoryResults);
  const scoutBackend = useScoutStore((state) => state.backend);
  const populationTier = useScoutStore((state) => state.populationTier);
  const setPopulationTier = useScoutStore((state) => state.setPopulationTier);

  const isOverallView = selectedTab === 'overall';
  const selectedCategory = isOverallView ? 'career' : selectedTab; // fallback for category-specific code

  // Get results from store
  const overallLocations = storeOverallResults ?? [];
  const analysis = isOverallView ? null : (storeCategoryResults.get(selectedTab as ScoutCategory) ?? null);

  // Check if we're still computing (progress shown in AstroLoadingOverlay at page level)
  const isComputing = scoutProgress.phase === 'initializing' || scoutProgress.phase === 'computing';

  const backend = scoutBackend ?? 'typescript';

  // Get filtered analysis based on country selection (only for category view)
  const filteredAnalysis = useMemo(() => {
    if (!analysis) return null;
    if (selectedCountry === 'all') return analysis;
    return filterAnalysisByCountry(analysis, selectedCountry);
  }, [analysis, selectedCountry]);

  // Get unique countries for filter dropdown
  const countries = useMemo(() => {
    if (!analysis) return [];
    return getCountriesFromAnalysis(analysis);
  }, [analysis]);

  // Filter and rank countries by normalized score - for category view
  const displayCountries = useMemo((): RankedCountryGroup[] => {
    if (!filteredAnalysis) return [];
    // Filter locations by view filter (good or avoid)
    const filteredCountries = filteredAnalysis.countries.map(country => {
      const filteredLocations = country.locations.filter(l => l.nature === viewFilter);
      return {
        ...country,
        locations: filteredLocations,
        beneficialCount: filteredLocations.filter(l => l.nature === 'beneficial').length,
        challengingCount: filteredLocations.filter(l => l.nature === 'challenging').length,
      };
    }).filter(c => c.locations.length > 0);
    // Rank by normalized score
    return rankCountriesByScore(filteredCountries);
  }, [filteredAnalysis, viewFilter]);

  // Get locations sorted by score for "Top Locations" view - top 5% (min 200)
  const topLocations = useMemo(() => {
    if (!filteredAnalysis) return [];

    // Count total cities across all countries (before view filter)
    let totalCities = 0;
    for (const country of filteredAnalysis.countries) {
      totalCities += country.locations.length;
    }

    const allLocations: (ScoutLocation & { countryName: string })[] = [];
    for (const country of filteredAnalysis.countries) {
      for (const location of country.locations) {
        // Filter by view filter (good or avoid)
        if (location.nature !== viewFilter) continue;

        allLocations.push({
          ...location,
          countryName: country.country,
        });
      }
    }

    // Sort by score descending, limit to top 5% of total cities (min 200)
    const limit = getLocationLimit(totalCities);
    return allLocations.sort((a, b) => b.overallScore - a.overallScore).slice(0, limit);
  }, [filteredAnalysis, viewFilter]);

  // Filter overall locations by country (for overall view) - top 5% (min 200)
  const filteredOverallLocations = useMemo(() => {
    if (!isOverallView) return [];

    // Calculate limit based on total cities (before any filters)
    const limit = getLocationLimit(overallLocations.length);

    let locations = overallLocations;
    if (selectedCountry !== 'all') {
      locations = locations.filter(l => l.city.country === selectedCountry);
    }
    // Filter by view filter (good or avoid)
    if (viewFilter === 'beneficial') {
      locations = locations.filter(l => l.beneficialCategories > l.challengingCategories);
    } else {
      locations = locations.filter(l => l.challengingCategories > l.beneficialCategories);
    }
    // Apply limit (top 5% of total cities, min 200)
    return locations.slice(0, limit);
  }, [isOverallView, overallLocations, selectedCountry, viewFilter]);

  // Build combined list of items for virtualized Overall Top Locations
  const overallVirtualItems = useMemo((): OverallVirtualItem[] => {
    if (!isOverallView || viewMode !== 'top' || filteredOverallLocations.length === 0) {
      return [];
    }

    const items: OverallVirtualItem[] = [];
    const blurredCount = Math.min(FREE_LOCATION_LIMIT, filteredOverallLocations.length);

    // For non-authenticated users: signup prompt + blurred cards + real locations
    if (!isAuthenticated) {
      // 1. Signup prompt
      items.push({ type: 'signupPrompt', remainingCount: blurredCount });

      // 2. Blurred fake cards (premium content)
      for (let i = 0; i < blurredCount; i++) {
        items.push({
          type: 'blurredOverall',
          fakeCity: FAKE_CITIES[i],
          rank: i + 1,
        });
      }

      // 3. Real locations after the blurred ones
      const realLocations = filteredOverallLocations.slice(FREE_LOCATION_LIMIT);
      for (let i = 0; i < realLocations.length; i++) {
        items.push({
          type: 'overallLocation',
          location: realLocations[i],
          rank: FREE_LOCATION_LIMIT + i + 1,
        });
      }
    } else {
      // Authenticated: show all locations
      for (let i = 0; i < filteredOverallLocations.length; i++) {
        items.push({
          type: 'overallLocation',
          location: filteredOverallLocations[i],
          rank: i + 1,
        });
      }
    }

    return items;
  }, [isOverallView, viewMode, filteredOverallLocations, isAuthenticated]);

  // Virtual list for Overall Top Locations
  const {
    virtualItems: overallVirtualListItems,
    totalHeight: overallTotalHeight,
  } = useVirtualList({
    items: overallVirtualItems,
    itemHeight: (index, item) => getOverallVirtualItemHeight(item),
    containerRef: overallTopScrollRef,
    overscan: SCOUT_LIST_VIRTUALIZATION_CONFIG.overscan,
    minItemsForVirtualization: SCOUT_LIST_VIRTUALIZATION_CONFIG.minItemsForVirtualization,
  });

  // Get unique countries for overall view (for country filter dropdown)
  const overallCountries = useMemo(() => {
    if (!isOverallView) return [];
    const countrySet = new Set(overallLocations.map(l => l.city.country));
    return Array.from(countrySet).sort();
  }, [isOverallView, overallLocations]);

  // Group overall locations by country for Countries view
  const overallCountryGroups = useMemo((): OverallCountryGroup[] => {
    if (!isOverallView || viewMode !== 'countries') return [];
    const groups = groupOverallByCountry(filteredOverallLocations);
    // Filter by selected country if set
    if (selectedCountry !== 'all') {
      return groups.filter(g => g.country === selectedCountry);
    }
    return groups;
  }, [isOverallView, viewMode, filteredOverallLocations, selectedCountry]);

  // Toggle country expansion
  const toggleCountry = useCallback((country: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(country)) {
        next.delete(country);
      } else {
        next.add(country);
      }
      return next;
    });
  }, []);

  // Handle city click
  const handleCityClick = useCallback((location: ScoutLocation) => {
    onCityClick?.(location.city.lat, location.city.lng, location.city.name);
  }, [onCityClick]);

  // Handle overall city click
  const handleOverallCityClick = useCallback((location: OverallScoutLocation) => {
    onCityClick?.(location.city.lat, location.city.lng, location.city.name);
  }, [onCityClick]);

  // Auto-show all markers on globe when in "Top Locations" mode
  // Only show markers after all rankings are computed (not during computation)
  useEffect(() => {
    if (!onShowCountryMarkers) return;

    // Don't show markers while computing - wait for complete results
    if (isComputing) {
      onShowCountryMarkers([]);
      return;
    }

    // Only show markers in "Top Locations" mode
    if (viewMode !== 'top') {
      // Clear markers when switching to "By Country" mode
      onShowCountryMarkers([]);
      return;
    }

    // For overall view, show top 500 filtered locations as markers
    if (isOverallView && filteredOverallLocations.length > 0) {
      const markers: ScoutMarker[] = filteredOverallLocations.map(loc => ({
        lat: loc.city.lat,
        lng: loc.city.lng,
        name: loc.city.name,
        nature: loc.beneficialCategories > loc.challengingCategories ? 'beneficial' : 'challenging',
      }));
      onShowCountryMarkers(markers);
      return;
    }

    // For category view, show top 500 locations as markers
    if (!isOverallView && topLocations.length > 0) {
      const markers: ScoutMarker[] = topLocations.map(loc => ({
        lat: loc.city.lat,
        lng: loc.city.lng,
        name: loc.city.name,
        nature: loc.nature,
      }));
      onShowCountryMarkers(markers);
      return;
    }
  }, [viewMode, isOverallView, filteredOverallLocations, topLocations, onShowCountryMarkers, isComputing]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0a0f]">
      {/* Category Tabs - Horizontal Scroll with Glass Morphism */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-white/10">
        <div className="relative flex items-center">
          {/* Left Arrow */}
          <button
            onClick={() => {
              const container = document.getElementById('scout-tabs-container');
              if (container) container.scrollBy({ left: -150, behavior: 'smooth' });
            }}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors ml-2"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-zinc-400" />
          </button>

          {/* Scrollable Tab Container */}
          <div
            id="scout-tabs-container"
            className="flex gap-2 overflow-x-auto scrollbar-hide px-3 py-3 flex-1"
          >
            {/* Overall Tab - First */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0',
                      'transition-all duration-300 ease-out',
                      'border backdrop-blur-sm',
                      isOverallView
                        ? 'bg-slate-800 dark:bg-white/10 border-slate-700 dark:border-white/30 text-white shadow-lg'
                        : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08] hover:text-slate-700 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'
                    )}
                    onClick={() => {
                      setSelectedTab('overall');
                      setSelectedCountry('all');
                      setExpandedCountries(new Set());
                      setViewMode('top');
                      // Show toast on mobile
                      showMobileToast('Cities ranked by combined scores across all life categories');
                    }}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Overall
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="hidden md:block bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-medium border-0"
                >
                  Cities ranked by combined scores across all life categories
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Category Tabs - Gated for paid users */}
            {SCOUT_CATEGORIES.map(cat => {
              const info = CATEGORY_INFO[cat];
              const isSelected = selectedTab === cat;
              const IconComponent = CATEGORY_ICONS[cat];
              const isLocked = !isPaidUser;
              return (
                <TooltipProvider key={cat} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex-shrink-0"
                        onClick={(e) => {
                          if (isLocked) {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowUpgradeModal(true);
                          }
                        }}
                      >
                        <button
                          type="button"
                          disabled={isLocked}
                          aria-disabled={isLocked}
                          className={cn(
                            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
                            'transition-all duration-300 ease-out',
                            'border backdrop-blur-sm',
                            isLocked && 'opacity-60 cursor-not-allowed pointer-events-none',
                            isSelected && !isLocked
                              ? cn(CATEGORY_COLORS[cat]?.selected, 'shadow-lg')
                              : CATEGORY_COLORS[cat]?.unselected
                          )}
                          onClick={() => {
                            setSelectedTab(cat);
                            setSelectedCountry('all');
                            setExpandedCountries(new Set());
                            setViewMode('top');
                            // Show toast on mobile
                            showMobileToast(info.description);
                          }}
                        >
                          <IconComponent className={cn('h-4 w-4', isSelected ? '' : CATEGORY_COLORS[cat]?.icon)} />
                          {info.label}
                          {isLocked && <Lock className="h-3 w-3 ml-0.5" />}
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="hidden md:block bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-medium border-0 max-w-[220px]"
                    >
                      {info.description}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => {
              const container = document.getElementById('scout-tabs-container');
              if (container) container.scrollBy({ left: 150, behavior: 'smooth' });
            }}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors mr-2"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4 text-slate-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Mobile description toast - shows briefly on tab tap */}
        <AnimatePresence>
          {mobileToast && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="px-4 pb-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <Info className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {mobileToast}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters Row - Compact single row */}
      <div className="flex-shrink-0 px-4 py-2 flex items-center gap-2 border-b border-slate-200 dark:border-white/5">
        {/* View Mode Toggle - Compact segmented control */}
        <div className="flex items-center bg-slate-100 dark:bg-white/[0.03] rounded-lg p-0.5 border border-slate-200 dark:border-white/10">
          <button
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-medium transition-all',
              viewMode === 'top'
                ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
            onClick={() => setViewMode('top')}
          >
            <Trophy className="h-3 w-3 inline mr-1" />
            Top
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-medium transition-all',
              viewMode === 'countries'
                ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
            onClick={() => setViewMode('countries')}
          >
            <Globe2 className="h-3 w-3 inline mr-1" />
            Countries
          </button>
        </div>

        {/* City Size Filter - Population tier */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select value={populationTier} onValueChange={(value) => setPopulationTier(value as PopulationTier)}>
                  <SelectTrigger className="w-auto min-w-[80px] max-w-[110px] h-7 text-[10px] bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 px-2">
                    <Building2 className="h-3 w-3 mr-1 opacity-60" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                    {POPULATION_TIER_ORDER.map(tier => (
                      <SelectItem key={tier} value={tier} className="text-xs">
                        <span className="font-medium">{POPULATION_TIERS[tier].label}</span>
                        <span className="ml-1.5 text-slate-400 dark:text-slate-500">
                          {POPULATION_TIERS[tier].approximateCities}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="hidden md:block bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-medium border-0"
            >
              Filter by city size: {POPULATION_TIERS[populationTier].description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Country Filter - compact dropdown */}
        {(isOverallView || viewMode === 'countries') && (
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-auto min-w-[100px] max-w-[180px] h-7 text-[10px] bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 px-2">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
              <SelectItem value="all">All Countries</SelectItem>
              {(isOverallView ? overallCountries : countries).map(country => (
                <SelectItem key={country} value={country}>
                  <span className="flex items-center gap-2">
                    <span>{getCountryFlag(country)}</span>
                    <span>{getCountryName(country)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Filter - Good/Avoid toggle */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/[0.03] rounded-lg p-0.5 border border-slate-200 dark:border-white/10">
          <button
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-0.5',
              viewFilter === 'beneficial'
                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                : 'text-slate-500 dark:text-slate-400'
            )}
            onClick={() => setViewFilter('beneficial')}
          >
            <ThumbsUp className="h-2.5 w-2.5" />
            Good
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-0.5',
              viewFilter === 'challenging'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            )}
            onClick={() => setViewFilter('challenging')}
          >
            <ThumbsDown className="h-2.5 w-2.5" />
            Avoid
          </button>
        </div>
      </div>

      {/* Stats Summary - Compact inline version */}
      <div className="flex-shrink-0 px-4 py-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        {isOverallView ? (
          viewMode === 'top' ? (
            <>
              <span>{isComputing ? '...' : filteredOverallLocations.length} locations · {filteredOverallLocations.filter(l => l.beneficialCategories > l.challengingCategories).length} good</span>
              <span>{overallCountries.length} {overallCountries.length === 1 ? 'country' : 'countries'}</span>
            </>
          ) : (
            <>
              <span>{isComputing ? '...' : overallCountryGroups.length} countries ranked</span>
              <span>{filteredOverallLocations.length} total cities</span>
            </>
          )
        ) : (
          <>
            <span>{isComputing ? '...' : (filteredAnalysis?.totalBeneficial ?? 0)} beneficial · {isComputing ? '...' : (filteredAnalysis?.totalChallenging ?? 0)} challenging</span>
            <span>{displayCountries.length} {displayCountries.length === 1 ? 'country' : 'countries'}</span>
          </>
        )}
      </div>

      {/* Location List */}
      <div className="flex-1 min-h-0 relative">
        {isOverallView ? (
          // Overall View - Ranked by combined scores across all categories
          viewMode === 'top' ? (
            // Top Locations View (cities ranked) for Overall tab
            !isComputing && filteredOverallLocations.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 py-12">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
                  <Globe2 className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No locations found
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                  Try adjusting your filters or ensure your birth chart has planetary lines calculated.
                </p>
              </div>
            ) : (
              <div
                ref={overallTopScrollRef}
                className="absolute inset-0 overflow-y-auto scrollbar-hide"
              >
                {/* Virtualized Overall Top Locations list */}
                <div className="p-4">
                  <VirtualListContainer totalHeight={overallTotalHeight}>
                    {overallVirtualListItems.map(({ item, index, style }) => {
                      // Render the appropriate card based on item type
                      if (item.type === 'signupPrompt') {
                        return (
                          <div key="signup-prompt" style={style}>
                            <SignUpPromptCard
                              remainingCount={item.remainingCount}
                              category="overall"
                              isTopLocations
                            />
                          </div>
                        );
                      }
                      if (item.type === 'blurredOverall') {
                        return (
                          <div key={`blurred-${item.rank}`} style={style}>
                            <BlurredOverallCard
                              fakeCity={item.fakeCity}
                              rank={item.rank}
                            />
                          </div>
                        );
                      }
                      // item.type === 'overallLocation'
                      return (
                        <div key={`${item.location.city.name}-${item.location.city.country}-${index}`} style={style}>
                          <OverallLocationCard
                            location={item.location}
                            rank={item.rank}
                            onClick={() => handleOverallCityClick(item.location)}
                          />
                        </div>
                      );
                    })}
                  </VirtualListContainer>
                </div>
              </div>
            )
          ) : (
            // Countries View for Overall tab - grouped by country with normalized scoring
            !isComputing && overallCountryGroups.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 py-12">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
                  <Globe2 className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No countries found
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                  Try adjusting your filters or ensure your birth chart has planetary lines calculated.
                </p>
              </div>
            ) : (
              <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
                <div>
                  {overallCountryGroups.map(country => (
                    <OverallCountrySection
                      key={country.country}
                      country={country}
                      isExpanded={expandedCountries.has(country.country)}
                      onToggle={() => toggleCountry(country.country)}
                      onCityClick={handleOverallCityClick}
                      onShowMarkers={onShowCountryMarkers}
                    />
                  ))}
                </div>
              </div>
            )
          )
        ) : viewMode === 'top' ? (
          // Top Locations View - All locations ranked by score (category view)
          !isComputing && topLocations.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
                <MapPin className="h-10 w-10 text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No locations for {CATEGORY_INFO[selectedCategory]?.label || 'this category'}
              </p>
              <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                Your chart may not have strong influences in this life area. Try another category.
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
              <div className="p-4 space-y-3">
                {/* For non-authenticated: show signup prompt first, then blurred top 5, then real locations */}
                {!isAuthenticated && topLocations.length > 0 && (
                  <>
                    {/* Signup prompt at top */}
                    <SignUpPromptCard
                      remainingCount={Math.min(FREE_LOCATION_LIMIT, topLocations.length)}
                      category={selectedCategory}
                      isTopLocations
                    />
                    {/* Blurred fake top 5 (premium content) */}
                    {FAKE_CITIES.slice(0, Math.min(FREE_LOCATION_LIMIT, topLocations.length)).map((fakeCity, idx) => (
                      <BlurredRankedCard
                        key={`blurred-${idx}`}
                        fakeCity={fakeCity}
                        rank={idx + 1}
                      />
                    ))}
                  </>
                )}
                {/* Show all locations for authenticated, or locations after top 5 for non-authenticated */}
                {(isAuthenticated ? topLocations : topLocations.slice(FREE_LOCATION_LIMIT)).map((location, idx) => (
                  <RankedLocationCard
                    key={`${location.city.name}-${idx}`}
                    location={location}
                    rank={isAuthenticated ? idx + 1 : FREE_LOCATION_LIMIT + idx + 1}
                    category={selectedCategory}
                    onClick={() => handleCityClick(location)}
                  />
                ))}
              </div>
            </div>
          )
        ) : (
          // Countries View - Grouped by country
          !isComputing && displayCountries.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
                <Globe2 className="h-10 w-10 text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No locations for {CATEGORY_INFO[selectedCategory]?.label || 'this category'}
              </p>
              <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                Your chart may not have strong influences in this life area. Try another category.
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
              <div>
                {displayCountries.map(country => (
                  <CountrySection
                    key={country.country}
                    country={country}
                    category={selectedCategory}
                    isExpanded={expandedCountries.has(country.country)}
                    onToggle={() => toggleCountry(country.country)}
                    onCityClick={handleCityClick}
                    onShowMarkers={onShowCountryMarkers}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Category Upgrade Modal */}
      <CategoryUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </div>
  );
};

// Category Upgrade Modal for gated categories
interface CategoryUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CategoryUpgradeModal: React.FC<CategoryUpgradeModalProps> = ({
  open,
  onOpenChange,
}) => {
  const user = useAuthUser();
  const isRealUser = useIsRealUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      // If logged in with a real account (not anonymous), use authenticated flow
      // Otherwise, use anonymous flow (Stripe collects email)
      const body = isRealUser && user
        ? {
            action: 'createSubscription',
            userId: user.id,
            email: user.email,
            plan: planId,
            successUrl: `${window.location.origin}/globe?subscription=success`,
            cancelUrl: window.location.href,
          }
        : {
            action: 'subscribeAnonymous',
            plan: planId,
            successUrl: `${window.location.origin}/success`,
            cancelUrl: window.location.href,
          };

      const { data, error } = await supabase.functions.invoke('ai-subscription', { body });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error starting checkout:', err);
      alert('Error starting checkout. Please try again.');
    }
    setLoadingPlan(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal - matches Landing page glass-card aesthetic */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto backdrop-blur-xl"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="relative px-6 pt-6 sm:pt-8 pb-5 border-b border-white/5">
          <div className="absolute top-3 sm:top-4 right-4">
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <span className="text-zinc-400 text-lg">&times;</span>
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-center text-white mb-1">
            Unlock Category Insights
          </h2>
          <p className="text-xs sm:text-sm text-center text-zinc-400">
            Access Career, Love, Health, Home, Wellbeing & Wealth categories
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="px-4 sm:px-6 py-5 grid grid-cols-2 gap-3">
          {/* Traveler Plan */}
          <div className="p-4 rounded-xl bg-white/5 border border-amber-500/30 flex flex-col relative">
            <div className="absolute -top-2 left-3">
              <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500 text-black rounded-full">
                Limited Offer
              </span>
            </div>
            <h3 className="text-base font-medium text-zinc-300 mb-1">Traveler</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold text-white">$10</span>
              <span className="text-xs text-zinc-500">/mo</span>
            </div>
            <p className="text-[10px] text-amber-400 mb-2">
              Use code <span className="font-mono font-bold">NEWYEARPLAN</span> for discount!
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-400 mb-4 flex-1">
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-500" />
                All category insights
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-500" />
                50 AI questions/mo
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-500" />
                Compatibility mode
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe('starter')}
              disabled={loadingPlan === 'starter'}
              className="w-full py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              {loadingPlan === 'starter' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                </span>
              ) : (
                'Subscribe'
              )}
            </button>
            <p className="text-[9px] text-zinc-500 text-center mt-2">First 100 users · Ends Jan 15</p>
          </div>

          {/* Mystic Plan */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/20 flex flex-col relative">
            <div className="absolute -top-2 right-3">
              <span className="px-2 py-0.5 text-[10px] font-medium bg-white text-black rounded-full">
                Popular
              </span>
            </div>
            <h3 className="text-base font-medium text-white mb-1">Mystic</h3>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-bold text-white">$20</span>
              <span className="text-xs text-zinc-500">/mo</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-400 mb-4 flex-1">
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-400" />
                Everything in Traveler
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-400" />
                Unlimited AI questions
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-400" />
                PDF Report Exports
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={loadingPlan === 'pro'}
              className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {loadingPlan === 'pro' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                </span>
              ) : (
                'Subscribe'
              )}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-5">
          <p className="text-center text-[10px] text-zinc-600">
            Cancel anytime. Secure payment via Stripe.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// Country section component - with normalized scoring
interface CountrySectionProps {
  country: RankedCountryGroup;
  category: ScoutCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onCityClick: (location: ScoutLocation) => void;
  onShowMarkers?: (markers: ScoutMarker[]) => void;
}

const CountrySection: React.FC<CountrySectionProps> = ({
  country,
  category,
  isExpanded,
  onToggle,
  onCityClick,
  onShowMarkers,
}) => {
  // Convert country locations to markers for globe display
  const handleShowOnGlobe = useCallback(() => {
    if (!onShowMarkers) return;
    const markers: ScoutMarker[] = country.locations.map(loc => ({
      lat: loc.city.lat,
      lng: loc.city.lng,
      name: loc.city.name,
      nature: loc.nature,
    }));
    onShowMarkers(markers);
  }, [country.locations, onShowMarkers]);

  return (
    <div className="border-b border-slate-200 dark:border-white/5 last:border-b-0">
      {/* Country Header */}
      <button
        className={cn(
          'w-full px-4 py-3.5 flex items-center justify-between',
          'transition-all duration-300',
          'hover:bg-slate-100 dark:hover:bg-white/[0.03]',
          isExpanded && 'bg-slate-50 dark:bg-white/[0.02]'
        )}
        onClick={() => {
          onToggle();
          handleShowOnGlobe();
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{getCountryFlag(country.country) || '🌍'}</span>
          <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{country.country}</span>
          <div className="flex items-center gap-1.5">
            {/* Beneficial/Challenging counts */}
            {country.beneficialCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                <ThumbsUp className="h-2 w-2" />
                {country.beneficialCount}
              </span>
            )}
            {country.challengingCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ThumbsDown className="h-2 w-2" />
                {country.challengingCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{country.locations.length} cities</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Locations */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2">
              {country.locations.map((location, idx) => (
                <LocationCard
                  key={`${location.city.name}-${idx}`}
                  location={location}
                  category={category}
                  onClick={() => onCityClick(location)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Overall country section component - for Countries view in Overall tab
interface OverallCountrySectionProps {
  country: OverallCountryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onCityClick: (location: OverallScoutLocation) => void;
  onShowMarkers?: (markers: ScoutMarker[]) => void;
}

const OverallCountrySection: React.FC<OverallCountrySectionProps> = ({
  country,
  isExpanded,
  onToggle,
  onCityClick,
  onShowMarkers,
}) => {
  // Convert country locations to markers for globe display
  const handleShowOnGlobe = useCallback(() => {
    if (!onShowMarkers) return;
    const markers: ScoutMarker[] = country.locations.map(loc => ({
      lat: loc.city.lat,
      lng: loc.city.lng,
      name: loc.city.name,
      nature: loc.beneficialCategories > loc.challengingCategories ? 'beneficial' : 'challenging',
    }));
    onShowMarkers(markers);
  }, [country.locations, onShowMarkers]);

  return (
    <div className="border-b border-slate-200 dark:border-white/5 last:border-b-0">
      {/* Country Header */}
      <button
        className={cn(
          'w-full px-4 py-3.5 flex items-center justify-between',
          'transition-all duration-300',
          'hover:bg-slate-100 dark:hover:bg-white/[0.03]',
          isExpanded && 'bg-slate-50 dark:bg-white/[0.02]'
        )}
        onClick={() => {
          onToggle();
          handleShowOnGlobe();
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{getCountryFlag(country.country) || '🌍'}</span>
          <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{country.country}</span>
          <div className="flex items-center gap-1.5">
            {/* Beneficial/Challenging counts */}
            {country.beneficialCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                <ThumbsUp className="h-2 w-2" />
                {country.beneficialCount}
              </span>
            )}
            {country.challengingCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ThumbsDown className="h-2 w-2" />
                {country.challengingCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{country.locations.length} cities</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Locations - sorted by totalScore (highest first) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2">
              {country.locations.map((location, idx) => (
                <OverallLocationCard
                  key={`${location.city.name}-${location.city.country}-${idx}`}
                  location={location}
                  rank={idx + 1}
                  onClick={() => onCityClick(location)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Location card component with expandable influences
interface LocationCardProps {
  location: ScoutLocation;
  category: ScoutCategory;
  onClick: () => void;
}

const LocationCard: React.FC<LocationCardProps> = ({
  location,
  category,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isBeneficial = location.nature === 'beneficial';
  const hasMoreInfluences = location.influences.length > 2;
  const setHighlightedScoutCity = useGlobeInteractionStore((s) => s.setHighlightedScoutCity);

  const handleMouseEnter = useCallback(() => {
    setHighlightedScoutCity({
      lat: location.city.lat,
      lng: location.city.lng,
      name: location.city.name,
    });
  }, [location.city, setHighlightedScoutCity]);

  const handleMouseLeave = useCallback(() => {
    setHighlightedScoutCity(null);
  }, [setHighlightedScoutCity]);

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl cursor-pointer',
        'bg-white dark:bg-white/[0.02] backdrop-blur-sm',
        'border transition-all duration-300',
        isBeneficial
          ? 'border-green-500/20 hover:border-green-500/40 hover:bg-green-50 dark:hover:bg-green-500/[0.05]'
          : 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/[0.05]'
      )}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
              isBeneficial ? 'bg-green-500/10' : 'bg-amber-500/10'
            )}>
              <MapPin className={cn(
                'h-4 w-4',
                isBeneficial ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
              )} />
            </div>
            <div className="min-w-0">
              <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate block">{location.city.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Navigation className="h-2.5 w-2.5" />
                  {location.distance} km
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Badge */}
        <div className={cn(
          'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border',
          location.overallScore >= 80 && 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
          location.overallScore >= 60 && location.overallScore < 80 && 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
          location.overallScore >= 40 && location.overallScore < 60 && 'bg-slate-500/10 border-slate-400/30 text-slate-600 dark:text-slate-400',
          location.overallScore < 40 && 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
        )}>
          {location.overallScore}
        </div>
      </div>

      {/* Influence Pills */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {location.influences.slice(0, isExpanded ? undefined : 2).map((influence, idx) => (
          <span
            key={idx}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium',
              'bg-slate-100 dark:bg-white/[0.03] border',
              isBeneficial ? 'border-green-500/20 text-green-700 dark:text-green-300' : 'border-amber-500/20 text-amber-700 dark:text-amber-300'
            )}
          >
            {influence.planet} {influence.lineType}
            {influence.isAspect && ` · ${influence.aspectType}`}
          </span>
        ))}
        {hasMoreInfluences && !isExpanded && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            +{location.influences.length - 2} more
          </span>
        )}
      </div>

      {/* Expanded Influence Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 space-y-2">
              {location.influences.map((influence, idx) => (
                <div key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                  <span className={cn(
                    'font-medium',
                    isBeneficial ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                  )}>
                    {influence.planet} {influence.lineType}:
                  </span>{' '}
                  {getPlainLanguageInfluence(influence, category)}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand/Collapse Button */}
      {hasMoreInfluences && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-end">
          <button
            className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Show less' : 'Show details'}
            <ChevronDown className={cn('h-3 w-3 inline ml-0.5 transition-transform', isExpanded && 'rotate-180')} />
          </button>
        </div>
      )}
    </div>
  );
};

// Ranked location card for "Top Locations" view
interface RankedLocationCardProps {
  location: ScoutLocation & { countryName: string };
  rank: number;
  category: ScoutCategory;
  onClick: () => void;
}

const RankedLocationCard: React.FC<RankedLocationCardProps> = ({
  location,
  rank,
  category,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isBeneficial = location.nature === 'beneficial';
  const hasMoreInfluences = location.influences.length > 1;
  const setHighlightedScoutCity = useGlobeInteractionStore((s) => s.setHighlightedScoutCity);

  const handleMouseEnter = useCallback(() => {
    setHighlightedScoutCity({
      lat: location.city.lat,
      lng: location.city.lng,
      name: location.city.name,
    });
  }, [location.city, setHighlightedScoutCity]);

  const handleMouseLeave = useCallback(() => {
    setHighlightedScoutCity(null);
  }, [setHighlightedScoutCity]);

  // Rank styling - top 3 get special treatment (flat colors, no gradients)
  const getRankStyle = () => {
    if (rank === 1) return 'bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400';
    if (rank === 2) return 'bg-slate-500/10 border border-slate-400/40 text-slate-600 dark:text-slate-400';
    if (rank === 3) return 'bg-amber-600/10 border border-amber-600/30 text-amber-700 dark:text-amber-500';
    return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10';
  };

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl cursor-pointer',
        'bg-white dark:bg-white/[0.02] backdrop-blur-sm',
        'border transition-all duration-300',
        // Top 3 get subtle border accent
        rank === 1 && 'border-amber-500/30',
        rank === 2 && 'border-slate-400/30',
        rank === 3 && 'border-amber-600/30',
        rank > 3 && (isBeneficial
          ? 'border-green-500/20 hover:border-green-500/40'
          : 'border-amber-500/20 hover:border-amber-500/40'),
        'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
      )}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start gap-3">
        {/* Rank Badge */}
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm',
          getRankStyle()
        )}>
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* City Name & Country */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate block">{location.city.name}</span>
              <span className="text-xs text-slate-500">
                {getCountryFlag(location.countryName)} {location.countryName}
              </span>
            </div>
          </div>

          {/* Nature Badge + Score */}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
              isBeneficial
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            )}>
              {isBeneficial ? <ThumbsUp className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />}
              {isBeneficial ? 'Beneficial' : 'Challenging'}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              {location.distance} km
            </span>
          </div>

          {/* Key Influence Pill */}
          {location.influences.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium',
                'bg-slate-100 dark:bg-white/[0.03] border',
                isBeneficial ? 'border-green-500/20 text-green-700 dark:text-green-300' : 'border-amber-500/20 text-amber-700 dark:text-amber-300'
              )}>
                {location.influences[0].planet} {location.influences[0].lineType}
              </span>
              {hasMoreInfluences && !isExpanded && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  +{location.influences.length - 1} more
                </span>
              )}
            </div>
          )}

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 space-y-2">
                  {location.influences.map((influence, idx) => (
                    <div key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                      <span className={cn(
                        'font-medium',
                        isBeneficial ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                      )}>
                        {influence.planet} {influence.lineType}:
                      </span>{' '}
                      {getPlainLanguageInfluence(influence, category)}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Score Badge */}
        <div className={cn(
          'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border',
          location.overallScore >= 80 && 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
          location.overallScore >= 60 && location.overallScore < 80 && 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
          location.overallScore >= 40 && location.overallScore < 60 && 'bg-slate-500/10 border-slate-400/30 text-slate-600 dark:text-slate-400',
          location.overallScore < 40 && 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
        )}>
          {location.overallScore}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      {hasMoreInfluences && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-end">
          <button
            className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Show less' : 'Show details'}
            <ChevronDown className={cn('h-3 w-3 inline ml-0.5 transition-transform', isExpanded && 'rotate-180')} />
          </button>
        </div>
      )}
    </div>
  );
};

// Overall location card for cross-category ranking
interface OverallLocationCardProps {
  location: OverallScoutLocation;
  rank: number;
  onClick: () => void;
}

const OverallLocationCard: React.FC<OverallLocationCardProps> = ({
  location,
  rank,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMostlyBeneficial = location.beneficialCategories > location.challengingCategories;
  const hasMoreCategories = location.categoryScores.length > 3;
  const setHighlightedScoutCity = useGlobeInteractionStore((s) => s.setHighlightedScoutCity);

  const handleMouseEnter = useCallback(() => {
    setHighlightedScoutCity({
      lat: location.city.lat,
      lng: location.city.lng,
      name: location.city.name,
    });
  }, [location.city, setHighlightedScoutCity]);

  const handleMouseLeave = useCallback(() => {
    setHighlightedScoutCity(null);
  }, [setHighlightedScoutCity]);

  // Rank styling - top 3 get special treatment (flat colors, no gradients)
  const getRankStyle = () => {
    if (rank === 1) return 'bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400';
    if (rank === 2) return 'bg-slate-500/10 border border-slate-400/40 text-slate-600 dark:text-slate-400';
    if (rank === 3) return 'bg-amber-600/10 border border-amber-600/30 text-amber-700 dark:text-amber-500';
    return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10';
  };

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl cursor-pointer',
        'bg-white dark:bg-white/[0.02] backdrop-blur-sm',
        'border transition-all duration-300',
        // Top 3 get subtle border accent
        rank === 1 && 'border-amber-500/30',
        rank === 2 && 'border-slate-400/30',
        rank === 3 && 'border-amber-600/30',
        rank > 3 && 'border-indigo-500/20 hover:border-indigo-500/40',
        'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
      )}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start gap-3">
        {/* Rank Badge */}
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm',
          getRankStyle()
        )}>
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* City Name & Country */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate block">{location.city.name}</span>
              <span className="text-xs text-slate-500">
                {getCountryFlag(location.city.country)} {location.city.country}
              </span>
            </div>
          </div>

          {/* Category Summary Badges */}
          <div className="flex items-center gap-2 mt-2">
            {location.beneficialCategories > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                <ThumbsUp className="h-2.5 w-2.5" />
                {location.beneficialCategories} good
              </span>
            )}
            {location.challengingCategories > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <ThumbsDown className="h-2.5 w-2.5" />
                {location.challengingCategories} challenging
              </span>
            )}
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              {location.distance} km
            </span>
          </div>

          {/* Category Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {location.categoryScores.slice(0, isExpanded ? undefined : 3).map((cs) => {
              const IconComponent = CATEGORY_ICONS[cs.category];
              return (
                <span
                  key={cs.category}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium',
                    'bg-slate-100 dark:bg-white/[0.03] border',
                    cs.nature === 'beneficial'
                      ? 'border-green-500/20 text-green-700 dark:text-green-300'
                      : 'border-amber-500/20 text-amber-700 dark:text-amber-300'
                  )}
                >
                  <IconComponent className="h-3 w-3" />
                  {CATEGORY_INFO[cs.category].label}
                </span>
              );
            })}
            {hasMoreCategories && !isExpanded && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                +{location.categoryScores.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Score Badge */}
        <div className={cn(
          'flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full text-sm font-bold border',
          isMostlyBeneficial
            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
            : 'bg-slate-500/10 border-slate-400/30 text-slate-600 dark:text-slate-400'
        )}>
          {location.totalScore}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      {hasMoreCategories && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-end">
          <button
            className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Show less' : 'Show all categories'}
            <ChevronDown className={cn('h-3 w-3 inline ml-0.5 transition-transform', isExpanded && 'rotate-180')} />
          </button>
        </div>
      )}
    </div>
  );
};

// Blurred fake card for overall view (hack-proof placeholder)
interface BlurredOverallCardProps {
  fakeCity: { name: string; country: string };
  rank: number;
}

const BlurredOverallCard: React.FC<BlurredOverallCardProps> = ({ fakeCity, rank }) => {
  const getRankStyle = () => {
    if (rank <= 3) return 'bg-slate-500/10 border border-slate-400/40 text-slate-600 dark:text-slate-400';
    return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10';
  };

  return (
    <div className="relative p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 select-none pointer-events-none">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[6px] bg-white/50 dark:bg-black/30 rounded-xl z-10" />

      <div className="flex items-start gap-3 blur-[2px]">
        {/* Rank Badge */}
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm',
          getRankStyle()
        )}>
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 block">{fakeCity.name}</span>
          <span className="text-xs text-slate-500">🌍 {fakeCity.country}</span>

          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              <ThumbsUp className="h-2.5 w-2.5" />
              3 good
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              847 km
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/[0.03] border border-green-500/20 text-green-700 dark:text-green-300">
              <Briefcase className="h-3 w-3" />
              Career
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/[0.03] border border-green-500/20 text-green-700 dark:text-green-300">
              <Heart className="h-3 w-3" />
              Love
            </span>
          </div>
        </div>

        {/* Score Badge - deterministic based on rank */}
        <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full text-sm font-bold border bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
          {95 - (rank * 3)}
        </div>
      </div>
    </div>
  );
};

// Blurred fake card for category view (hack-proof placeholder)
interface BlurredRankedCardProps {
  fakeCity: { name: string; country: string };
  rank: number;
}

const BlurredRankedCard: React.FC<BlurredRankedCardProps> = ({ fakeCity, rank }) => {
  const getRankStyle = () => {
    if (rank <= 3) return 'bg-slate-500/10 border border-slate-400/40 text-slate-600 dark:text-slate-400';
    return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10';
  };

  return (
    <div className="relative p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 select-none pointer-events-none">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[6px] bg-white/50 dark:bg-black/30 rounded-xl z-10" />

      <div className="flex items-start gap-3 blur-[2px]">
        {/* Rank Badge */}
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm',
          getRankStyle()
        )}>
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 block">{fakeCity.name}</span>
          <span className="text-xs text-slate-500">🌍 {fakeCity.country}</span>

          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              <ThumbsUp className="h-2.5 w-2.5" />
              Beneficial
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              623 km
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/[0.03] border border-green-500/20 text-green-700 dark:text-green-300">
              Sun MC
            </span>
          </div>
        </div>

        {/* Score Badge - deterministic based on rank */}
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400">
          {92 - (rank * 4)}
        </div>
      </div>
    </div>
  );
};

// Sign up prompt card for gated content
interface SignUpPromptCardProps {
  remainingCount: number;
  category: string;
  /** If true, this gates the TOP locations (premium) rather than extras */
  isTopLocations?: boolean;
}

const SignUpPromptCard: React.FC<SignUpPromptCardProps> = ({
  remainingCount,
  category,
  isTopLocations = false,
}) => {
  const { signInWithGoogle } = useAuthActions();
  const { showPrompt: showOneTap, isAvailable: oneTapAvailable } = useGoogleOneTap({ disabled: true }); // disabled=true prevents auto-show
  const [showAuthModal, setShowAuthModal] = useState(false);
  const categoryLabel = category === 'overall' ? 'all categories' : CATEGORY_INFO[category as ScoutCategory]?.label?.toLowerCase() || category;

  // Handle Google sign-in: try One Tap first, fall back to OAuth redirect
  const handleGoogleSignIn = useCallback(() => {
    if (oneTapAvailable) {
      // Show Google One Tap popup
      showOneTap();
    } else {
      // Fall back to OAuth redirect
      signInWithGoogle();
    }
  }, [oneTapAvailable, showOneTap, signInWithGoogle]);

  return (
    <>
      <div className="relative p-5 rounded-xl bg-white/5 dark:bg-[#0a0a0a] border border-white/10 backdrop-blur-sm">
        {/* Lock Icon */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <Lock className="h-4 w-4 text-zinc-300" />
          </div>
        </div>

        <div className="text-center pt-3">
          <p className="text-sm font-medium text-slate-800 dark:text-white mb-1">
            {isTopLocations ? (
              <>Unlock Your Top {remainingCount} Locations</>
            ) : (
              <>+{remainingCount} more locations</>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
            {isTopLocations ? (
              <>Sign up free to reveal your best places for {categoryLabel}</>
            ) : (
              <>Sign up free to see all your best places for {categoryLabel}</>
            )}
          </p>

          {/* Auth buttons */}
          <div className="space-y-2">
            {/* Google Sign In - Uses One Tap when available */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-white text-black border border-slate-200 dark:border-white/20 hover:bg-slate-50 dark:hover:bg-zinc-200 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium text-slate-700 dark:text-black">
                Continue with Google
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
              <span className="text-xs text-slate-400 dark:text-zinc-500">or</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
            </div>

            {/* Email Sign In/Up */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <Mail className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-white">
                Continue with Email
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        initialView="sign_up"
      />
    </>
  );
};

export default ScoutPanel;

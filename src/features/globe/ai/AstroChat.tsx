/**
 * AstroChat Component
 * AI-powered chat panel for astrocartography insights
 * Uses Perplexity AI via Supabase Edge Functions
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCopilotContext } from './useCopilotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  MapPin,
  Navigation,
  Compass,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  Loader2,
  History,
  Plus,
  Trash2,
  Zap,
  Crown,
  Mail,
  Briefcase,
  Heart,
  Plane,
  Home,
  Bot,
} from 'lucide-react';
import { useAISubscription } from './useAISubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth-context';
import { useGoogleOneTap } from '@/hooks/useGoogleOneTap';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatHistory } from '@/hooks/useChatHistory';
import { getLineInterpretation, getLineOneLiner } from './line-interpretations';
import { UpgradePromptCard } from './UpgradePromptCard';
import type { Planet, PlanetaryLine, PlanetaryPosition, NatalChartResult, NatalChartSettings, AspectLine, ParanLine, RelocationChartResult } from '@/lib/astro-types';
import type { LocationAnalysis } from '@/lib/location-line-utils';
import type { AstroAIContext, LineInterpretation, ZoneAnalysis } from './types';

// Zodiac signs for display
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

interface AstroChatProps {
  // Map state
  birthData: {
    date: string;
    time: string;
    location: string;
    latitude: number;
    longitude: number;
  } | null;
  planetaryPositions: PlanetaryPosition[];
  visibleLines: PlanetaryLine[];
  aspectLines?: AspectLine[];
  paranLines?: ParanLine[];
  selectedLine: PlanetaryLine | null;
  locationAnalysis: LocationAnalysis | null;
  mode: 'standard' | 'relocated' | 'localSpace';
  relocationTarget?: { latitude: number; longitude: number; name?: string };

  // Zone analysis
  zoneAnalysis?: ZoneAnalysis | null;

  // Natal chart state
  natalChartResult?: NatalChartResult | null;
  natalChartSettings?: NatalChartSettings;

  // Duo mode / Partner data
  isDuoMode?: boolean;
  personName?: string;
  partnerName?: string;
  partnerBirthData?: {
    date: string;
    time: string;
    location: string;
    latitude: number;
    longitude: number;
  } | null;
  partnerPlanetaryPositions?: PlanetaryPosition[];
  partnerVisibleLines?: PlanetaryLine[];
  partnerAspectLines?: AspectLine[];
  partnerParanLines?: ParanLine[];
  partnerNatalChartResult?: NatalChartResult | null;

  // Relocation chart data
  relocationChartResult?: RelocationChartResult | null;

  // Actions
  onHighlightLine?: (planet: Planet, lineType: 'ASC' | 'DSC' | 'MC' | 'IC') => void;
  onClearHighlight?: () => void;
  onZoomToLocation?: (lat: number, lng: number, altitude?: number) => void;
  onAnalyzeLocation?: (lat: number, lng: number) => void;
  onTogglePlanet?: (planet: Planet) => void;
  onRelocateTo?: (lat: number, lng: number, name?: string) => void;
  onReturnToStandard?: () => void;

  // UI state
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;

  // Ask AI about location - context from right-click menu
  askLocationContext?: {
    lat: number;
    lng: number;
    name: string;
  } | null;
  onClearAskLocationContext?: () => void;
}

// Line interpretation card component
const LineInterpretationCard: React.FC<{ interpretation: LineInterpretation }> = ({
  interpretation,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: getPlanetColor(interpretation.planet) }}
            >
              {interpretation.planet.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{interpretation.title}</CardTitle>
              <div className="flex items-center gap-1 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-xs ${i < interpretation.rating ? 'text-amber-400' : 'text-slate-300'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
          {interpretation.shortDescription}
        </p>

        {/* Themes */}
        <div className="flex flex-wrap gap-1 mb-2">
          {interpretation.themes.slice(0, expanded ? undefined : 3).map((theme) => (
            <span
              key={theme}
              className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
            >
              {theme}
            </span>
          ))}
          {!expanded && interpretation.themes.length > 3 && (
            <span className="text-[10px] text-slate-400">+{interpretation.themes.length - 3}</span>
          )}
        </div>

        {expanded && (
          <>
            {/* Best For */}
            <div className="mb-2">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Best for:
              </p>
              <div className="flex flex-wrap gap-1">
                {interpretation.bestFor.map((item) => (
                  <span
                    key={item}
                    className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Challenges */}
            {interpretation.challenges && interpretation.challenges.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Challenges:
                </p>
                <div className="flex flex-wrap gap-1">
                  {interpretation.challenges.slice(0, 3).map((item) => (
                    <span
                      key={item}
                      className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Careers */}
            {interpretation.careers && interpretation.careers.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Career paths:
                </p>
                <p className="text-[10px] text-slate-600 dark:text-slate-300">
                  {interpretation.careers.slice(0, 4).join(' · ')}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Major cities database for location queries
const MAJOR_CITIES: Record<string, { lat: number; lng: number; country: string }> = {
  // North America
  'new york': { lat: 40.7128, lng: -74.0060, country: 'USA' },
  'nyc': { lat: 40.7128, lng: -74.0060, country: 'USA' },
  'los angeles': { lat: 34.0522, lng: -118.2437, country: 'USA' },
  'la': { lat: 34.0522, lng: -118.2437, country: 'USA' },
  'chicago': { lat: 41.8781, lng: -87.6298, country: 'USA' },
  'san francisco': { lat: 37.7749, lng: -122.4194, country: 'USA' },
  'sf': { lat: 37.7749, lng: -122.4194, country: 'USA' },
  'miami': { lat: 25.7617, lng: -80.1918, country: 'USA' },
  'seattle': { lat: 47.6062, lng: -122.3321, country: 'USA' },
  'austin': { lat: 30.2672, lng: -97.7431, country: 'USA' },
  'denver': { lat: 39.7392, lng: -104.9903, country: 'USA' },
  'boston': { lat: 42.3601, lng: -71.0589, country: 'USA' },
  'toronto': { lat: 43.6532, lng: -79.3832, country: 'Canada' },
  'vancouver': { lat: 49.2827, lng: -123.1207, country: 'Canada' },
  'mexico city': { lat: 19.4326, lng: -99.1332, country: 'Mexico' },

  // Europe
  'london': { lat: 51.5074, lng: -0.1278, country: 'UK' },
  'paris': { lat: 48.8566, lng: 2.3522, country: 'France' },
  'berlin': { lat: 52.5200, lng: 13.4050, country: 'Germany' },
  'rome': { lat: 41.9028, lng: 12.4964, country: 'Italy' },
  'madrid': { lat: 40.4168, lng: -3.7038, country: 'Spain' },
  'barcelona': { lat: 41.3851, lng: 2.1734, country: 'Spain' },
  'amsterdam': { lat: 52.3676, lng: 4.9041, country: 'Netherlands' },
  'vienna': { lat: 48.2082, lng: 16.3738, country: 'Austria' },
  'prague': { lat: 50.0755, lng: 14.4378, country: 'Czech Republic' },
  'lisbon': { lat: 38.7223, lng: -9.1393, country: 'Portugal' },
  'athens': { lat: 37.9838, lng: 23.7275, country: 'Greece' },
  'stockholm': { lat: 59.3293, lng: 18.0686, country: 'Sweden' },
  'copenhagen': { lat: 55.6761, lng: 12.5683, country: 'Denmark' },
  'dublin': { lat: 53.3498, lng: -6.2603, country: 'Ireland' },
  'zurich': { lat: 47.3769, lng: 8.5417, country: 'Switzerland' },
  'munich': { lat: 48.1351, lng: 11.5820, country: 'Germany' },
  'milan': { lat: 45.4642, lng: 9.1900, country: 'Italy' },

  // Asia
  'tokyo': { lat: 35.6762, lng: 139.6503, country: 'Japan' },
  'beijing': { lat: 39.9042, lng: 116.4074, country: 'China' },
  'shanghai': { lat: 31.2304, lng: 121.4737, country: 'China' },
  'hong kong': { lat: 22.3193, lng: 114.1694, country: 'Hong Kong' },
  'singapore': { lat: 1.3521, lng: 103.8198, country: 'Singapore' },
  'bangkok': { lat: 13.7563, lng: 100.5018, country: 'Thailand' },
  'seoul': { lat: 37.5665, lng: 126.9780, country: 'South Korea' },
  'mumbai': { lat: 19.0760, lng: 72.8777, country: 'India' },
  'delhi': { lat: 28.6139, lng: 77.2090, country: 'India' },
  'dubai': { lat: 25.2048, lng: 55.2708, country: 'UAE' },
  'tel aviv': { lat: 32.0853, lng: 34.7818, country: 'Israel' },
  'istanbul': { lat: 41.0082, lng: 28.9784, country: 'Turkey' },
  'taipei': { lat: 25.0330, lng: 121.5654, country: 'Taiwan' },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869, country: 'Malaysia' },
  'jakarta': { lat: -6.2088, lng: 106.8456, country: 'Indonesia' },
  'bali': { lat: -8.3405, lng: 115.0920, country: 'Indonesia' },

  // Oceania
  'sydney': { lat: -33.8688, lng: 151.2093, country: 'Australia' },
  'melbourne': { lat: -37.8136, lng: 144.9631, country: 'Australia' },
  'auckland': { lat: -36.8509, lng: 174.7645, country: 'New Zealand' },
  'brisbane': { lat: -27.4698, lng: 153.0251, country: 'Australia' },
  'perth': { lat: -31.9505, lng: 115.8605, country: 'Australia' },

  // South America
  'rio de janeiro': { lat: -22.9068, lng: -43.1729, country: 'Brazil' },
  'rio': { lat: -22.9068, lng: -43.1729, country: 'Brazil' },
  'sao paulo': { lat: -23.5505, lng: -46.6333, country: 'Brazil' },
  'buenos aires': { lat: -34.6037, lng: -58.3816, country: 'Argentina' },
  'lima': { lat: -12.0464, lng: -77.0428, country: 'Peru' },
  'bogota': { lat: 4.7110, lng: -74.0721, country: 'Colombia' },
  'santiago': { lat: -33.4489, lng: -70.6693, country: 'Chile' },
  'medellin': { lat: 6.2476, lng: -75.5658, country: 'Colombia' },

  // Africa & Middle East
  'cairo': { lat: 30.0444, lng: 31.2357, country: 'Egypt' },
  'cape town': { lat: -33.9249, lng: 18.4241, country: 'South Africa' },
  'johannesburg': { lat: -26.2041, lng: 28.0473, country: 'South Africa' },
  'nairobi': { lat: -1.2921, lng: 36.8219, country: 'Kenya' },
  'marrakech': { lat: 31.6295, lng: -7.9811, country: 'Morocco' },

  // Special locations
  'hawaii': { lat: 21.3069, lng: -157.8583, country: 'USA' },
  'honolulu': { lat: 21.3069, lng: -157.8583, country: 'USA' },
  'ibiza': { lat: 38.9067, lng: 1.4206, country: 'Spain' },
  'santorini': { lat: 36.3932, lng: 25.4615, country: 'Greece' },
  'bora bora': { lat: -16.5004, lng: -151.7415, country: 'French Polynesia' },
  'maldives': { lat: 3.2028, lng: 73.2207, country: 'Maldives' },
  'reykjavik': { lat: 64.1466, lng: -21.9426, country: 'Iceland' },
};

// Find city by name (fuzzy match)
function findCity(query: string): { name: string; lat: number; lng: number; country: string } | null {
  const normalized = query.toLowerCase().trim();

  // Direct match
  if (MAJOR_CITIES[normalized]) {
    const city = MAJOR_CITIES[normalized];
    return { name: normalized, ...city };
  }

  // Partial match
  for (const [cityName, coords] of Object.entries(MAJOR_CITIES)) {
    if (cityName.includes(normalized) || normalized.includes(cityName)) {
      return { name: cityName, ...coords };
    }
  }

  return null;
}

// Parse coordinates from text (e.g., "40.7, -74" or "40.7° N, 74° W")
function parseCoordinates(text: string): { lat: number; lng: number } | null {
  // Try simple format: "40.7, -74" or "40.7 -74"
  const simpleMatch = text.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (simpleMatch) {
    const lat = parseFloat(simpleMatch[1]);
    const lng = parseFloat(simpleMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Try degree format: "40° N, 74° W"
  const degreeMatch = text.match(/(\d+\.?\d*)°?\s*([NS])[,\s]+(\d+\.?\d*)°?\s*([EW])/i);
  if (degreeMatch) {
    let lat = parseFloat(degreeMatch[1]);
    let lng = parseFloat(degreeMatch[3]);
    if (degreeMatch[2].toUpperCase() === 'S') lat = -lat;
    if (degreeMatch[4].toUpperCase() === 'W') lng = -lng;
    return { lat, lng };
  }

  return null;
}

// Planet color helper
function getPlanetColor(planet: Planet): string {
  const colors: Record<Planet, string> = {
    Sun: '#FFD700',
    Moon: '#C0C0C0',
    Mercury: '#B8860B',
    Venus: '#FF69B4',
    Mars: '#DC143C',
    Jupiter: '#9400D3',
    Saturn: '#8B4513',
    Uranus: '#00CED1',
    Neptune: '#4169E1',
    Pluto: '#2F4F4F',
    Chiron: '#98FB98',
    NorthNode: '#8A2BE2',
  };
  return colors[planet] || '#888888';
}

// Markdown message renderer with proper styling for chat
const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => {
  // Remove Perplexity citation markers like [1], [2], [6][7], etc.
  const cleanedContent = content.replace(/\[\d+\]/g, '');

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 mt-3 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1.5 mt-2.5 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 mt-2 first:mt-0">
            {children}
          </h3>
        ),
        // Paragraphs
        p: ({ children }) => (
          <p className="text-xs text-slate-700 dark:text-slate-200 mb-2 last:mb-0 leading-relaxed">
            {children}
          </p>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="text-xs text-slate-700 dark:text-slate-200 mb-2 ml-3 space-y-1 list-disc list-outside">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="text-xs text-slate-700 dark:text-slate-200 mb-2 ml-3 space-y-1 list-decimal list-outside">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed pl-1">{children}</li>
        ),
        // Strong/Bold
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-800 dark:text-slate-100">{children}</strong>
        ),
        // Emphasis/Italic
        em: ({ children }) => (
          <em className="italic text-slate-600 dark:text-slate-300">{children}</em>
        ),
        // Code
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-200">
                {children}
              </code>
            );
          }
          return (
            <code className="block p-2 my-2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-200 overflow-x-auto">
              {children}
            </code>
          );
        },
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-amber-400 dark:border-amber-500 pl-2 my-2 text-xs text-slate-600 dark:text-slate-300 italic">
            {children}
          </blockquote>
        ),
        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 dark:text-amber-400 hover:underline"
          >
            {children}
          </a>
        ),
        // Horizontal rule
        hr: () => <hr className="my-2 border-slate-200 dark:border-slate-700" />,
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-[10px] border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-200 dark:bg-slate-700">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-2 py-1 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-600">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            {children}
          </td>
        ),
      }}
    >
      {cleanedContent}
    </ReactMarkdown>
  );
};

export const AstroChat: React.FC<AstroChatProps> = ({
  birthData,
  planetaryPositions,
  visibleLines,
  aspectLines = [],
  paranLines = [],
  selectedLine,
  locationAnalysis,
  mode,
  relocationTarget,
  // Zone analysis
  zoneAnalysis,
  // Natal chart state
  natalChartResult,
  natalChartSettings,
  // Duo mode / Partner data
  isDuoMode = false,
  personName = 'You',
  partnerName = 'Partner',
  partnerBirthData,
  partnerPlanetaryPositions = [],
  partnerVisibleLines = [],
  partnerAspectLines = [],
  partnerParanLines = [],
  partnerNatalChartResult,
  // Relocation chart data
  relocationChartResult,
  // Actions
  onHighlightLine,
  onClearHighlight,
  onZoomToLocation,
  onAnalyzeLocation,
  onTogglePlanet,
  onRelocateTo,
  onReturnToStandard,
  isOpen = false,
  onToggle,
  className = '',
  // Ask AI about location context
  askLocationContext,
  onClearAskLocationContext,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    interpretation?: LineInterpretation;
    isUpgradePrompt?: boolean;
    isUpgradeCard?: boolean;
  }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // AI Subscription tracking
  const {
    status: subscriptionStatus,
    canAskQuestion,
    getRemainingDisplay,
    refreshStatus,
    getSubscriptionInfo,
  } = useAISubscription();

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auth and chat history
  // Note: user exists for anonymous sessions too, check is_anonymous for real auth
  const { user, signInWithGoogle } = useAuth();
  const isAuthenticated = user && !user.is_anonymous;
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const { signInWithPassword, signUp } = useAuth();

  // Google One Tap - disabled auto-show, trigger manually
  const { showPrompt: showOneTap, isAvailable: oneTapAvailable } = useGoogleOneTap({ disabled: true });

  // Handle Google sign-in with One Tap preference
  const handleGoogleSignIn = useCallback(async () => {
    setIsSigningIn(true);

    // Try Google One Tap first (shows popup instead of redirect)
    if (oneTapAvailable) {
      showOneTap();
      setTimeout(() => setIsSigningIn(false), 500);
      return;
    }

    // Fallback to OAuth redirect
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
    }
    setIsSigningIn(false);
  }, [oneTapAvailable, showOneTap, signInWithGoogle]);
  const {
    currentConversation,
    messages: savedMessages,
    conversations,
    loadingConversations,
    createConversation,
    loadConversation,
    deleteConversation,
    addMessage,
    loadingMessages,
    getRelatedContext,
  } = useChatHistory();

  // Message type for chat display
  type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    interpretation?: LineInterpretation;
    isUpgradePrompt?: boolean;
    isUpgradeCard?: boolean;
  };

  // Use saved messages if authenticated and have a conversation, otherwise use local
  const messages: ChatMessage[] = isAuthenticated && currentConversation
    ? savedMessages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        interpretation: m.interpretation as LineInterpretation | undefined,
        isUpgradePrompt: false,
        isUpgradeCard: false,
      }))
    : localMessages;

  const setMessages = isAuthenticated && currentConversation
    ? () => {} // Messages are managed by useChatHistory
    : setLocalMessages;

  // === CopilotKit Context (Singleton pattern with deferred initialization) ===
  // Consolidates all readable contexts and actions into a single hook to prevent initialization errors
  useCopilotContext(
    {
      birthData,
      planetaryPositions,
      visibleLines,
      aspectLines,
      paranLines,
      selectedLine,
      locationAnalysis,
      zoneAnalysis: zoneAnalysis || null,
      mode,
      relocationTarget,
      natalChartResult: natalChartResult || null,
      natalChartSettings,
      isDuoMode,
      personName,
      partnerName,
      partnerBirthData: partnerBirthData || null,
      partnerPlanetaryPositions,
      partnerVisibleLines,
      partnerAspectLines,
      partnerParanLines,
      partnerNatalChartResult: partnerNatalChartResult || null,
    },
    {
      onHighlightLine,
      onClearHighlight,
      onZoomToLocation,
      onAnalyzeLocation,
      onTogglePlanet,
      onRelocateTo,
    }
  );

  // Create a new conversation when user logs in and has birth data
  useEffect(() => {
    if (isAuthenticated && !currentConversation && birthData && isOpen) {
      createConversation({
        date: birthData.date,
        time: birthData.time,
        location: birthData.location,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
      });
    }
  }, [isAuthenticated, currentConversation, birthData, isOpen, createConversation]);

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Handle new conversation
  const handleNewConversation = async () => {
    if (!isAuthenticated || !birthData) return;
    await createConversation({
      date: birthData.date,
      time: birthData.time,
      location: birthData.location,
      latitude: birthData.latitude,
      longitude: birthData.longitude,
    });
    setShowHistory(false);
  };

  // Handle loading a conversation
  const handleLoadConversation = async (conversationId: string) => {
    await loadConversation(conversationId);
    setShowHistory(false);
  };

  // Get zodiac sign from ecliptic longitude
  function getZodiacSign(longitude: number): string {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    const signIndex = Math.floor((longitude % 360) / 30);
    return signs[signIndex];
  }

  // Handle tool calls from AI response
  const handleToolCalls = (toolCalls: Array<{ action: string; params: Record<string, unknown> }>) => {
    for (const toolCall of toolCalls) {
      switch (toolCall.action) {
        case 'zoomToCity':
          const cityName = toolCall.params.cityName as string;
          const city = findCity(cityName);
          if (city && onZoomToLocation) {
            onZoomToLocation(city.lat, city.lng, 0.4);
            if (onAnalyzeLocation) {
              setTimeout(() => onAnalyzeLocation(city.lat, city.lng), 1000);
            }
          }
          break;
        case 'highlightLine':
          const planet = toolCall.params.planet as string;
          const lineType = toolCall.params.lineType as string;
          if (onHighlightLine) {
            onHighlightLine(planet as Planet, lineType as 'ASC' | 'DSC' | 'MC' | 'IC');
          }
          break;
        case 'analyzeLocation':
          const locationName = toolCall.params.locationName as string;
          const loc = findCity(locationName);
          if (loc && onAnalyzeLocation) {
            if (onZoomToLocation) {
              onZoomToLocation(loc.lat, loc.lng, 0.4);
            }
            setTimeout(() => onAnalyzeLocation(loc.lat, loc.lng), 1000);
          }
          break;
      }
    }
  };

  // Handle sending a message via Perplexity AI
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Check if user can ask a question (subscription limit)
    const { allowed, reason } = canAskQuestion();
    if (!allowed) {
      // Show the upgrade card with plan options
      setLocalMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: reason || 'You have reached your question limit.',
        isUpgradeCard: true,
      }]);
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    // Clear location context after sending (context is captured in the API call)
    if (askLocationContext && onClearAskLocationContext) {
      onClearAskLocationContext();
    }
    setIsLoading(true);

    // Add user message locally or to database
    if (isAuthenticated && currentConversation) {
      await addMessage({ role: 'user', content: userMessage });
    } else {
      const userMsgId = Date.now().toString();
      setLocalMessages(prev => [...prev, {
        id: userMsgId,
        role: 'user',
        content: userMessage,
      }]);
    }

    // Get subscription info for tracking
    const subInfo = getSubscriptionInfo();

    try {
      // Fetch related context from past conversations (semantic search)
      let relatedContext: string | null = null;
      if (isAuthenticated) {
        relatedContext = await getRelatedContext(userMessage);
      }

      // Build context for the AI
      const context = {
        birthData: birthData ? {
          date: birthData.date,
          time: birthData.time,
          location: birthData.location,
          latitude: birthData.latitude,
          longitude: birthData.longitude,
        } : undefined,
        planetaryPositions: planetaryPositions.map(p => ({
          planet: p.planet,
          sign: getZodiacSign(p.eclipticLongitude),
          degree: p.eclipticLongitude % 30,
        })),
        selectedLine: selectedLine ? {
          planet: selectedLine.planet,
          lineType: selectedLine.lineType,
        } : undefined,
        locationAnalysis: locationAnalysis ? {
          latitude: locationAnalysis.latitude,
          longitude: locationAnalysis.longitude,
          nearbyLines: locationAnalysis.lines.slice(0, 5).map(l => ({
            planet: l.planet,
            lineType: l.lineType || 'ASPECT',
            distance: l.distance,
          })),
        } : undefined,
        visibleLines: visibleLines.slice(0, 10).map(l => ({
          planet: l.planet,
          lineType: l.lineType,
        })),
        // Aspect lines (harmonious and challenging)
        aspectLines: aspectLines.slice(0, 10).map(a => ({
          planet: a.planet,
          angle: a.angle,
          aspectType: a.aspectType,
          isHarmonious: a.isHarmonious,
        })),
        // Paran lines (combined planetary influences)
        paranLines: paranLines.slice(0, 10).map(p => ({
          planet1: p.planet1,
          angle1: p.angle1,
          planet2: p.planet2,
          angle2: p.angle2,
          latitude: p.latitude,
        })),
        // Zone analysis if user has drawn a region
        zoneAnalysis: zoneAnalysis ? {
          bounds: zoneAnalysis.bounds,
          center: zoneAnalysis.center,
          linesInZone: zoneAnalysis.linesInZone,
          summary: zoneAnalysis.summary,
        } : undefined,
        mode,
        // Include related context from past conversations
        relatedContext,
        // Include natal chart data if available
        natalChart: natalChartResult ? {
          ascendant: {
            degree: natalChartResult.ascendant,
            sign: ZODIAC_SIGNS[Math.floor(natalChartResult.ascendant / 30)],
          },
          midheaven: {
            degree: natalChartResult.midheaven,
            sign: ZODIAC_SIGNS[Math.floor(natalChartResult.midheaven / 30)],
          },
          houseSystem: natalChartSettings?.houseSystem,
          zodiacType: natalChartSettings?.zodiacType,
        } : undefined,
        // Relocation chart comparison data
        relocationChart: relocationChartResult ? {
          originalLocation: {
            lat: relocationChartResult.originalLat,
            lng: relocationChartResult.originalLng,
          },
          relocatedLocation: {
            lat: relocationChartResult.relocatedLat,
            lng: relocationChartResult.relocatedLng,
          },
          ascendantShift: relocationChartResult.ascendantShift,
          midheavenShift: relocationChartResult.midheavenShift,
          relocatedAscendant: {
            degree: relocationChartResult.relocatedAscendant,
            sign: ZODIAC_SIGNS[Math.floor(relocationChartResult.relocatedAscendant / 30)],
          },
          relocatedMidheaven: {
            degree: relocationChartResult.relocatedMidheaven,
            sign: ZODIAC_SIGNS[Math.floor(relocationChartResult.relocatedMidheaven / 30)],
          },
          houseSystem: relocationChartResult.houseSystem,
          zodiacType: relocationChartResult.zodiacType,
          changedPlanets: relocationChartResult.planets
            .filter(p => p.houseChanged)
            .map(p => ({
              planet: p.planet,
              originalHouse: p.originalHouse,
              relocatedHouse: p.relocatedHouse,
              sign: p.signName,
            })),
          unchangedPlanets: relocationChartResult.planets
            .filter(p => !p.houseChanged)
            .map(p => ({
              planet: p.planet,
              house: p.originalHouse,
              sign: p.signName,
            })),
        } : undefined,
        // Location context from "Ask AI" menu action
        askAboutLocation: askLocationContext ? {
          latitude: askLocationContext.lat,
          longitude: askLocationContext.lng,
          name: askLocationContext.name,
        } : undefined,
      };

      // Build conversation history (last 6 messages)
      const conversationHistory = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Call Supabase Edge Function (Perplexity AI) with subscription info
      const { data, error } = await supabase.functions.invoke('astro-ai-chat', {
        body: {
          message: userMessage,
          context,
          conversationHistory,
          subscriptionId: subInfo.subscriptionId,
          userId: subInfo.userId,
          anonymousId: subInfo.anonymousId,
          preferredModel: subscriptionStatus?.hasSonarProAccess ? 'sonar-pro' : 'sonar',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Check for subscription limit error
      if (data.error === 'subscription_limit') {
        setLocalMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `You've reached your question limit. ${data.reason}`,
          isUpgradeCard: true,
        }]);
        setIsLoading(false);
        return;
      }

      // Refresh subscription status after successful request
      refreshStatus();

      // Check for line interpretation in the response to show card
      let interpretation: LineInterpretation | undefined;
      const lowerMsg = userMessage.toLowerCase();
      const linePatterns = [
        /what.*(?:is|does|mean).*(\w+)\s+(asc|dsc|mc|ic)/i,
        /tell.*about.*(\w+)\s+(asc|dsc|mc|ic)/i,
        /(\w+)\s+(asc|dsc|mc|ic).*line/i,
      ];
      for (const pattern of linePatterns) {
        const match = lowerMsg.match(pattern);
        if (match) {
          const planetName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
          let lineType = match[2].toUpperCase();
          const interp = getLineInterpretation(planetName as Planet, lineType as 'ASC' | 'DSC' | 'MC' | 'IC');
          if (interp) {
            interpretation = interp;
            // Also highlight the line
            if (onHighlightLine) {
              onHighlightLine(planetName as Planet, lineType as 'ASC' | 'DSC' | 'MC' | 'IC');
            }
          }
          break;
        }
      }

      // Handle tool calls from AI
      if (data.toolCalls && data.toolCalls.length > 0) {
        handleToolCalls(data.toolCalls);
      }

      // Add assistant response locally or to database
      if (isAuthenticated && currentConversation) {
        await addMessage({
          role: 'assistant',
          content: data.message,
          tool_calls: data.toolCalls,
          interpretation,
        });
      } else {
        setLocalMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          interpretation,
        }]);
      }
    } catch (err) {
      console.error('Perplexity AI error:', err);
      // Add error message
      const errorContent = `I'm having trouble connecting to the AI service. Please try again in a moment. (${err instanceof Error ? err.message : 'Unknown error'})`;
      if (isAuthenticated && currentConversation) {
        await addMessage({ role: 'assistant', content: errorContent });
      } else {
        setLocalMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errorContent,
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything when closed - the AI is accessed via toolbar (desktop) or bottom nav (mobile)
  if (!isOpen) {
    return null;
  }

  // Calculate mobile header height (56px + safe-area-inset-top)
  const mobileTopOffset = 'calc(56px + env(safe-area-inset-top, 0px))';
  // Calculate mobile bottom nav height (64px + safe-area-inset-bottom)
  const mobileBottomOffset = 'calc(64px + env(safe-area-inset-bottom, 0px))';

  return (
    <Card
      className={`fixed z-40 flex flex-col overflow-hidden shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md ${
        isMobile
          ? 'left-0 right-0 rounded-none'
          : 'top-16 right-0 bottom-0 w-96 rounded-none border-l border-slate-200 dark:border-slate-800'
      } ${className}`}
      style={isMobile ? { top: mobileTopOffset, bottom: mobileBottomOffset } : undefined}
    >
      {/* Header */}
      <CardHeader className="pb-2 flex-shrink-0 flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-800 dark:bg-slate-700 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span>Astro Guide</span>
            <span className="text-[10px] text-slate-400 font-normal ml-1.5">AI</span>
          </div>
        </CardTitle>
        <div className="flex items-center gap-1">
          {/* Usage indicator with upgrade button */}
          {isAuthenticated && (
            <button
              onClick={() => setShowUpgradePanel(!showUpgradePanel)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                showUpgradePanel
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="View plans & upgrade"
            >
              <Zap className="w-3 h-3" />
              <span>{getRemainingDisplay()}</span>
              {subscriptionStatus?.hasSonarProAccess ? (
                <Crown className="w-3 h-3 text-amber-500 ml-0.5" />
              ) : (
                <Bot className="w-3 h-3 text-amber-500 ml-0.5" />
              )}
            </button>
          )}
          {/* History button (only for authenticated users) */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => { setShowHistory(!showHistory); setShowUpgradePanel(false); }}
              title="Chat history"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Upgrade panel - proactive upgrade options */}
      {showUpgradePanel && isAuthenticated && (
        <div className="border-b border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Upgrade Your Plan</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setShowUpgradePanel(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <UpgradePromptCard
            questionsUsed={subscriptionStatus?.questionsUsed || 0}
            questionsLimit={subscriptionStatus?.questionsLimit || 5}
          />
        </div>
      )}

      {/* History panel */}
      {showHistory && isAuthenticated && !showUpgradePanel && (
        <div className="border-b border-slate-200 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Conversations</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={handleNewConversation}
            >
              <Plus className="h-3 w-3" />
              New
            </Button>
          </div>
          <ScrollArea className="max-h-32">
            <div className="space-y-1">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-2">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 ${
                      currentConversation?.id === conv.id ? 'bg-slate-100 dark:bg-slate-700' : ''
                    }`}
                  >
                    <button
                      className="flex-1 text-left"
                      onClick={() => handleLoadConversation(conv.id)}
                    >
                      <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 truncate">
                        {conv.title || 'Untitled'}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="space-y-3">
          {/* Welcome message - Interactive empty state */}
          {messages.length === 0 && (
            <div className="py-2">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/20 dark:bg-amber-500/10 flex items-center justify-center">
                  <Bot className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  Your Personal Astro Guide
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAuthenticated ? 'Discover the best places on Earth for you' : 'Sign in to ask questions about your chart'}
                </p>
              </div>

              {/* Quick Action Cards */}
              <div className="space-y-2 mb-4">
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                  Popular Questions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Briefcase, label: 'Career hotspots', query: 'What are the best cities for my career success?', color: 'text-blue-500' },
                    { icon: Heart, label: 'Love & romance', query: 'Where are my most romantic locations for relationships?', color: 'text-rose-500' },
                    { icon: Plane, label: 'Travel destinations', query: 'What are the best travel destinations for me based on my chart?', color: 'text-emerald-500' },
                    { icon: Home, label: 'Best place to live', query: 'Where should I relocate for overall happiness and success?', color: 'text-purple-500' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast.error('Sign in required', {
                            description: 'Please sign in to ask questions.',
                            action: { label: 'Sign In', onClick: handleGoogleSignIn },
                          });
                          return;
                        }
                        setInputValue(item.query);
                      }}
                      className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left group"
                    >
                      <item.icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Explanations */}
              <div className="space-y-2 mb-4">
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                  Understand Your Lines
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { line: 'Sun MC', color: '#FFD700' },
                    { line: 'Venus DSC', color: '#FF69B4' },
                    { line: 'Jupiter ASC', color: '#9400D3' },
                    { line: 'Moon IC', color: '#C0C0C0' },
                    { line: 'Mars MC', color: '#DC143C' },
                    { line: 'Saturn DSC', color: '#8B4513' },
                  ].map((item) => (
                    <button
                      key={item.line}
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast.error('Sign in required', {
                            description: 'Please sign in to explore line meanings.',
                            action: { label: 'Sign In', onClick: handleGoogleSignIn },
                          });
                          return;
                        }
                        setInputValue(`What does my ${item.line} line mean?`);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group"
                    >
                      <span
                        className="w-2 h-2 rounded-full group-hover:scale-125 transition-transform"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">{item.line}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ask anything prompt */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Ask me anything
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      "Which cities have the strongest Jupiter influence for me?" or "Compare Paris vs Tokyo for my chart"
                    </p>
                  </div>
                </div>
              </div>

              {/* Proactive upgrade prompt for free tier users */}
              {isAuthenticated && subscriptionStatus && subscriptionStatus.planType === 'free' && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setShowUpgradePanel(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Get More Questions</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2">
                    {subscriptionStatus.questionsLimit - subscriptionStatus.questionsUsed} free questions remaining
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-white rounded-2xl rounded-br-md px-3 py-2'
                    : 'space-y-2'
                }`}
              >
                {msg.role === 'assistant' && (
                  <>
                    {/* Upgrade Card - inline plan selection */}
                    {(msg as typeof msg & { isUpgradeCard?: boolean }).isUpgradeCard ? (
                      <div className="rounded-2xl rounded-bl-md p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
                        <UpgradePromptCard
                          questionsUsed={subscriptionStatus?.questionsUsed || 5}
                          questionsLimit={subscriptionStatus?.questionsLimit || 5}
                        />
                      </div>
                    ) : (
                      <div className={`rounded-2xl rounded-bl-md px-3 py-2 ${
                        (msg as typeof msg & { isUpgradePrompt?: boolean }).isUpgradePrompt
                          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        <MarkdownMessage content={msg.content} />
                        {(msg as typeof msg & { isUpgradePrompt?: boolean }).isUpgradePrompt && (
                          <Button
                            size="sm"
                            className="mt-2 h-7 text-xs bg-amber-500 hover:bg-amber-600"
                            onClick={() => navigate('/ai-subscription')}
                          >
                            <Crown className="w-3 h-3 mr-1" />
                            Upgrade Plan
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
                {msg.role === 'user' && (
                  <p className="text-xs">{msg.content}</p>
                )}
                {msg.interpretation && (
                  <LineInterpretationCard interpretation={msg.interpretation} />
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Location Context Banner - shown when user clicked "Ask AI about location" */}
      {askLocationContext && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              Asking about <strong>{askLocationContext.name}</strong>
            </span>
          </div>
          <button
            onClick={onClearAskLocationContext}
            className="p-1 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded transition-colors flex-shrink-0"
            aria-label="Clear location context"
          >
            <X className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </button>
        </div>
      )}

      {/* Input - Auth gated */}
      <div className="p-3 flex-shrink-0 border-t border-slate-200 dark:border-slate-800">
        {isAuthenticated ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about your lines..."
              className="flex-1 text-sm px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border-0 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Button
              size="icon"
              className="h-9 w-9 rounded-full bg-amber-500 hover:bg-amber-600"
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
        ) : (
          <div className="py-2">
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-1 text-center font-medium">
              Sign in to unlock 5 free questions
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3 text-center">
              Subscribe for unlimited access
            </p>
            {!showEmailForm ? (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2 h-9"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                >
                  {isSigningIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                  )}
                  Continue with Google
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2 h-9 text-slate-600 dark:text-slate-400"
                  onClick={() => setShowEmailForm(true)}
                >
                  <Mail className="h-4 w-4" />
                  Sign in with Email
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Email"
                  className="text-sm px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 border-0 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password"
                  className="text-sm px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 border-0 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={async () => {
                      if (!emailInput || !passwordInput) {
                        toast.error('Please enter email and password');
                        return;
                      }
                      setIsSigningIn(true);
                      const { error } = await signInWithPassword(emailInput, passwordInput);
                      if (error) {
                        // If sign in fails, try sign up
                        const { error: signUpError } = await signUp(emailInput, passwordInput);
                        if (signUpError) {
                          toast.error(signUpError.message);
                        } else {
                          toast.success('Check your email to confirm your account');
                        }
                      }
                      setIsSigningIn(false);
                    }}
                    disabled={isSigningIn}
                  >
                    {isSigningIn ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setShowEmailForm(false);
                      setEmailInput('');
                      setPasswordInput('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                  New users will be sent a confirmation email
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AstroChat;

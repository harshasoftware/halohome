/**
 * LineReportPanel Component
 * Panel for selecting planetary lines and generating PDF reports
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FileDown, X, Loader2, ChevronDown, ChevronUp, Crown, Check, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generateAstroReport, type ReportConfig, type ReportResult } from '@/lib/generateAstroReport';
import { PLANET_COLORS, type Planet, type LineType } from '@/lib/astro-types';
import type { PlanetaryLine, ZenithPoint } from '@/lib/astro-types';
import { supabase } from '@/integrations/supabase/client';

// Premium tier pricing
const PREMIUM_PRICING = {
  5: { price: '$10', description: 'Top 5 cities per line' },
  10: { price: '$20', description: 'Top 10 cities per line' },
} as const;

// Generate a unique hash from birth details to secure the unlock
const generateBirthHash = (birthDate: string, birthTime: string, birthLocation: string): string => {
  const data = `${birthDate}-${birthTime}-${birthLocation}`.toLowerCase().trim();
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Check if user has premium unlocked from localStorage cache (for fast initial load)
const getCachedPremiumTier = (birthDate: string, birthTime: string, birthLocation: string): number => {
  try {
    const stored = localStorage.getItem('astro_premium_unlock');
    if (!stored) return 3; // Free tier

    const { birthHash, tier } = JSON.parse(stored);
    const currentHash = generateBirthHash(birthDate, birthTime, birthLocation);

    // Only valid if the birth hash matches (same birth chart)
    if (birthHash === currentHash) {
      return tier;
    }

    return 3; // Different birth data, return to free tier
  } catch {
    return 3;
  }
};

// Store premium unlock in localStorage cache
const cachePremiumUnlock = (tier: number, birthDate: string, birthTime: string, birthLocation: string): void => {
  const birthHash = generateBirthHash(birthDate, birthTime, birthLocation);
  localStorage.setItem('astro_premium_unlock', JSON.stringify({
    birthHash,
    tier,
  }));
};

// Check premium status from database
const checkPremiumFromDatabase = async (birthHash: string): Promise<{ hasPremium: boolean; tier: number }> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-astro-premium', {
      body: { birthHash },
    });

    if (error) throw error;
    if (data.error) throw new Error(data.error);

    return {
      hasPremium: data.hasPremium || false,
      tier: data.tier || 3,
    };
  } catch (err) {
    console.error('Error checking premium status:', err);
    return { hasPremium: false, tier: 3 };
  }
};

/**
 * Server-side verification for premium tier access before report generation.
 * Uses a fail-closed pattern - if verification fails, defaults to free tier (3 cities).
 * This prevents localStorage manipulation from bypassing payment.
 *
 * @security This is the authoritative check for premium access - do not skip.
 */
const verifyPremiumTierAccess = async (
  requestedTier: number,
  birthDate: string,
  birthTime: string,
  birthLocation: string
): Promise<{ verified: boolean; authorizedTier: number }> => {
  // Free tier (3 cities) doesn't require verification
  if (requestedTier <= 3) {
    return { verified: true, authorizedTier: 3 };
  }

  try {
    const birthHash = generateBirthHash(birthDate, birthTime, birthLocation);
    const { hasPremium, tier: dbTier } = await checkPremiumFromDatabase(birthHash);

    if (!hasPremium) {
      // Not premium - fail closed to free tier
      return { verified: false, authorizedTier: 3 };
    }

    // Verify requested tier doesn't exceed purchased tier
    if (requestedTier > dbTier) {
      return { verified: false, authorizedTier: dbTier };
    }

    // Verified! User has access to requested tier
    return { verified: true, authorizedTier: requestedTier };
  } catch (error) {
    console.error('Premium verification failed:', error);
    // Fail closed - return free tier on any error
    return { verified: false, authorizedTier: 3 };
  }
};

interface LineReportPanelProps {
  planetaryLines: PlanetaryLine[];
  zenithPoints: ZenithPoint[];
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  onClose?: () => void;
  isMobile?: boolean;
}

interface SelectedLine {
  planet: Planet;
  lineType: LineType;
}

const LineReportPanelComponent: React.FC<LineReportPanelProps> = ({
  planetaryLines,
  zenithPoints,
  birthDate = 'Unknown',
  birthTime = 'Unknown',
  birthLocation = 'Unknown',
  onClose,
  isMobile = false,
}) => {
  const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([]);
  const [citiesPerLine, setCitiesPerLine] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [premiumTier, setPremiumTier] = useState(3); // 3 = free, 5 = 5-cities, 10 = 10-cities
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false); // Server-side premium verification

  // Check premium status on mount and when birth data changes
  useEffect(() => {
    // First, check localStorage cache for fast initial load
    const cachedTier = getCachedPremiumTier(birthDate, birthTime, birthLocation);
    setPremiumTier(cachedTier);

    // Then verify against database
    const verifyPremium = async () => {
      const birthHash = generateBirthHash(birthDate, birthTime, birthLocation);
      const { hasPremium, tier: dbTier } = await checkPremiumFromDatabase(birthHash);

      if (hasPremium && dbTier > cachedTier) {
        // Database has higher tier, update cache and state
        cachePremiumUnlock(dbTier, birthDate, birthTime, birthLocation);
        setPremiumTier(dbTier);
      } else if (!hasPremium && cachedTier > 3) {
        // Cache says premium but database says no - clear cache
        localStorage.removeItem('astro_premium_unlock');
        setPremiumTier(3);
      }
    };

    verifyPremium();
  }, [birthDate, birthTime, birthLocation]);

  // Reset cities selection if current selection exceeds tier
  useEffect(() => {
    if (citiesPerLine > premiumTier) {
      setCitiesPerLine(3);
    }
  }, [premiumTier]);

  // Handle Stripe checkout for premium purchase
  const handleStripeCheckout = useCallback(async (tier: 5 | 10) => {
    setIsPurchasing(true);
    try {
      const birthHash = generateBirthHash(birthDate, birthTime, birthLocation);
      const currentUrl = window.location.origin;

      const { data, error } = await supabase.functions.invoke('create-astro-report-payment', {
        body: {
          tier,
          birthHash,
          successUrl: `${currentUrl}/astro-payment-success`,
          cancelUrl: currentUrl,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  }, [birthDate, birthTime, birthLocation]);

  // Handle cities per line selection
  const handleCitiesSelect = useCallback((num: number) => {
    if (num <= premiumTier) {
      setCitiesPerLine(num);
    } else if (num === 5 || num === 10) {
      // Locked tier - trigger Stripe checkout
      handleStripeCheckout(num as 5 | 10);
    }
  }, [premiumTier, handleStripeCheckout]);

  // Group lines by planet
  const linesByPlanet = useMemo(() => {
    const grouped: Record<Planet, PlanetaryLine[]> = {} as Record<Planet, PlanetaryLine[]>;
    planetaryLines.forEach(line => {
      if (!grouped[line.planet]) {
        grouped[line.planet] = [];
      }
      grouped[line.planet].push(line);
    });
    return grouped;
  }, [planetaryLines]);

  const availablePlanets = useMemo(() => Object.keys(linesByPlanet) as Planet[], [linesByPlanet]);

  // Toggle line selection
  const toggleLine = useCallback((planet: Planet, lineType: LineType) => {
    setSelectedLines(prev => {
      const exists = prev.some(l => l.planet === planet && l.lineType === lineType);
      if (exists) {
        return prev.filter(l => !(l.planet === planet && l.lineType === lineType));
      }
      return [...prev, { planet, lineType }];
    });
  }, []);

  // Select all lines
  const selectAll = useCallback(() => {
    const all: SelectedLine[] = [];
    planetaryLines.forEach(line => {
      all.push({ planet: line.planet, lineType: line.lineType });
    });
    setSelectedLines(all);
  }, [planetaryLines]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedLines([]);
  }, []);

  // Check if a line is selected
  const isLineSelected = useCallback((planet: Planet, lineType: LineType) => {
    return selectedLines.some(l => l.planet === planet && l.lineType === lineType);
  }, [selectedLines]);

  // Validate email format
  const isValidEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Send report via email
  const sendReportEmail = useCallback(async (result: ReportResult, email: string) => {
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: {
          to: email,
          reportType: 'astrocartography',
          pdfBase64: result.base64Data,
          pdfFileName: result.filename,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      toast.success(`Report sent to ${email}!`);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. The report was downloaded instead.');
    } finally {
      setIsSendingEmail(false);
    }
  }, []);

  // Generate report with server-side premium verification
  const handleGenerateReport = useCallback(async () => {
    if (selectedLines.length === 0) {
      toast.error('Please select at least one line');
      return;
    }

    if (sendEmail && !isValidEmail(emailAddress)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsGenerating(true);

    try {
      // Server-side verification for premium tiers (fail-closed pattern)
      let verifiedCitiesPerLine = citiesPerLine;

      if (citiesPerLine > 3) {
        setIsVerifying(true);
        const { verified, authorizedTier } = await verifyPremiumTierAccess(
          citiesPerLine,
          birthDate,
          birthTime,
          birthLocation
        );
        setIsVerifying(false);

        if (!verified) {
          // Verification failed - use authorized tier (which may be lower than requested)
          if (authorizedTier < citiesPerLine) {
            toast.error(`Premium access not verified. Generating report with ${authorizedTier} cities per line.`);
            verifiedCitiesPerLine = authorizedTier;
            // Update the UI state to reflect actual tier
            setCitiesPerLine(authorizedTier);
            // Clear invalid cache
            localStorage.removeItem('astro_premium_unlock');
            setPremiumTier(authorizedTier);
          }
        }
      }

      // Get the actual line objects for selected lines
      const linesToExport = planetaryLines.filter(line =>
        selectedLines.some(s => s.planet === line.planet && s.lineType === line.lineType)
      );

      const config: ReportConfig = {
        birthDate,
        birthTime,
        birthLocation,
        selectedLines: linesToExport,
        zenithPoints,
        citiesPerLine: verifiedCitiesPerLine, // Use server-verified tier
        returnBase64: sendEmail, // Get base64 data if we're sending email
      };

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = generateAstroReport(config);

      if (sendEmail && result) {
        // Send the PDF via email
        await sendReportEmail(result, emailAddress);
      } else {
        toast.success(`Report downloaded${verifiedCitiesPerLine > 3 ? ` with ${verifiedCitiesPerLine} cities per line` : ''}!`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
      setIsVerifying(false);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedLines, planetaryLines, zenithPoints, birthDate, birthTime, birthLocation, citiesPerLine, sendEmail, emailAddress, isValidEmail, sendReportEmail]);

  if (isMobile) {
    return (
      <>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
          {/* Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-800 dark:text-slate-200">Export Report</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedLines.length} lines selected
                </p>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {isExpanded && (
            <div className="px-4 pb-4 space-y-4">
              {/* Quick actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="flex-1 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="flex-1 text-xs"
                >
                  Clear
                </Button>
              </div>

              {/* Line selection - horizontal scroll */}
              <div className="overflow-x-auto pb-2 -mx-4 px-4">
                <div className="flex gap-2 min-w-max">
                  {availablePlanets.map(planet => (
                    <div key={planet} className="flex flex-col gap-1">
                      <span
                        className="text-[10px] font-medium px-1"
                        style={{ color: PLANET_COLORS[planet] }}
                      >
                        {planet}
                      </span>
                      <div className="flex gap-1">
                        {linesByPlanet[planet].map(line => (
                          <button
                            key={`${planet}-${line.lineType}`}
                            onClick={() => toggleLine(planet, line.lineType)}
                            className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                              isLineSelected(planet, line.lineType)
                                ? 'text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                            style={
                              isLineSelected(planet, line.lineType)
                                ? { backgroundColor: PLANET_COLORS[planet] }
                                : {}
                            }
                          >
                            {line.lineType}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cities per line selector */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Cities per line:</span>
                  {premiumTier > 3 && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> {premiumTier} cities unlocked
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {[3, 5, 10].map(num => {
                    const isLocked = num > premiumTier;
                    const isActive = citiesPerLine === num;
                    return (
                      <button
                        key={num}
                        onClick={() => handleCitiesSelect(num)}
                        disabled={isPurchasing}
                        className={`flex-1 h-11 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]'
                            : isLocked
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-2 border-amber-300 dark:border-amber-600 active:scale-95'
                              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 active:scale-95'
                        } disabled:opacity-50 disabled:scale-100`}
                      >
                        {num} cities
                        {isLocked && <Crown className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>

                </div>

              {/* Email option */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
                <button
                  onClick={() => setSendEmail(!sendEmail)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    sendEmail
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {sendEmail && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Email report to me</span>
                </button>

                {sendEmail && (
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="h-10 text-sm"
                  />
                )}
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerateReport}
                disabled={selectedLines.length === 0 || isGenerating || isPurchasing || isSendingEmail || isVerifying}
                className="w-full h-12"
              >
                {isPurchasing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opening checkout...
                  </span>
                ) : isVerifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying access...
                  </span>
                ) : isGenerating || isSendingEmail ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isSendingEmail ? 'Sending email...' : 'Generating...'}
                  </span>
                ) : sendEmail ? (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Report to Email
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileDown className="w-4 h-4" />
                    Download Free Report
                  </span>
                )}
              </Button>

              {/* Close button */}
              {onClose && (
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full text-slate-500"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        </>
    );
  }

  // Line types in order
  const lineTypes: LineType[] = ['MC', 'IC', 'ASC', 'DSC'];

  // Desktop version
  return (
    <>
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[480px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileDown className="w-6 h-6 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Export Report</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Select planetary lines to include
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pt-5 pb-3 space-y-4 overflow-y-auto flex-1">
          {/* Quick actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} className="text-sm h-9 px-4">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection} className="text-sm h-9 px-4">
                Clear
              </Button>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">{selectedLines.length}</span> lines selected
            </div>
          </div>

          {/* Line selection grid */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            {/* Grid header */}
            <div className="grid grid-cols-[100px_repeat(4,1fr)] gap-2 mb-3">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Planet
              </div>
              {lineTypes.map(type => (
                <div key={type} className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center uppercase tracking-wider">
                  {type}
                </div>
              ))}
            </div>

            {/* Planet rows */}
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {availablePlanets.map(planet => (
                <div key={planet} className="grid grid-cols-[100px_repeat(4,1fr)] gap-2 items-center">
                  {/* Planet name with color indicator */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-800 shadow-sm"
                      style={{ backgroundColor: PLANET_COLORS[planet] }}
                    />
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: PLANET_COLORS[planet] }}
                    >
                      {planet}
                    </span>
                  </div>

                  {/* Line type buttons */}
                  {lineTypes.map(lineType => {
                    const hasLine = linesByPlanet[planet]?.some(l => l.lineType === lineType);
                    const isSelected = isLineSelected(planet, lineType);

                    if (!hasLine) {
                      return (
                        <div key={lineType} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-700/30 opacity-30" />
                      );
                    }

                    return (
                      <button
                        key={lineType}
                        onClick={() => toggleLine(planet, lineType)}
                        className={`h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'text-white shadow-md scale-[1.02]'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm'
                        }`}
                        style={isSelected ? {
                          backgroundColor: PLANET_COLORS[planet],
                          boxShadow: `0 4px 12px ${PLANET_COLORS[planet]}40`
                        } : {}}
                      >
                        {isSelected && <Check className="w-4 h-4 inline mr-1" />}
                        {lineType}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fixed footer - always visible */}
        <div className="px-6 pb-5 pt-3 space-y-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white/95 dark:bg-slate-900/95">
          {/* Cities per line selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Cities:</span>
            <div className="flex gap-2 flex-1">
              {[3, 5, 10].map(num => {
                const isLocked = num > premiumTier;
                const isActive = citiesPerLine === num;

                return (
                  <button
                    key={num}
                    onClick={() => handleCitiesSelect(num)}
                    disabled={isPurchasing}
                    className={`flex-1 h-9 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : isLocked
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-600'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                    } disabled:opacity-50`}
                  >
                    {num}
                    {isLocked && <Crown className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
            {premiumTier > 3 && (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            )}
          </div>

          {/* Email option */}
          <div className="space-y-2">
            <button
              onClick={() => setSendEmail(!sendEmail)}
              className="flex items-center gap-2 w-full text-left"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                sendEmail
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {sendEmail && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Email report to me</span>
            </button>

            {sendEmail && (
              <Input
                type="email"
                placeholder="Enter your email address"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="h-10"
              />
            )}
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerateReport}
            disabled={selectedLines.length === 0 || isGenerating || isPurchasing || isSendingEmail || isVerifying}
            size="lg"
            className="w-full h-11 text-base font-semibold rounded-xl"
          >
            {isPurchasing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Opening checkout...
              </span>
            ) : isVerifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying access...
                  </span>
                ) : isGenerating || isSendingEmail ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {isSendingEmail ? 'Sending email...' : 'Generating Report...'}
              </span>
            ) : sendEmail ? (
              <span className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send Report ({selectedLines.length} lines)
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileDown className="w-5 h-5" />
                Download Report ({selectedLines.length} lines)
              </span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export const LineReportPanel = React.memo(LineReportPanelComponent);

export default LineReportPanel;

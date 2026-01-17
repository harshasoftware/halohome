/**
 * VastuPanelContent - Displays Vastu analysis results in the right panel
 *
 * Shows directional analysis, Vastu score, element balance, and remedies.
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import {
  Compass,
  Home,
  Droplets,
  Flame,
  Wind,
  Mountain,
  Star,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useVastuStore, type VastuAnalysis, type VastuZone, type VastuRemedy, type VastuElement, type VastuDirection, type VastuPlanet } from '@/stores/vastuStore';

// Element icons mapping
const ELEMENT_ICONS: Record<VastuElement, React.ReactNode> = {
  Earth: <Mountain className="h-4 w-4" />,
  Water: <Droplets className="h-4 w-4" />,
  Fire: <Flame className="h-4 w-4" />,
  Air: <Wind className="h-4 w-4" />,
  Space: <Star className="h-4 w-4" />,
};

// Element colors
const ELEMENT_COLORS: Record<VastuElement, string> = {
  Earth: 'text-[#d4a5a5] bg-[#d4a5a5]/10 dark:bg-[#d4a5a5]/20',
  Water: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  Fire: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  Air: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
  Space: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
};

// Planet icons mapping
const PLANET_ICONS: Record<VastuPlanet, React.ReactNode> = {
  Sun: <Sun className="h-3 w-3" />,
  Moon: <Moon className="h-3 w-3" />,
  Mars: <Circle className="h-3 w-3" />,
  Mercury: <Circle className="h-3 w-3" />,
  Jupiter: <Circle className="h-3 w-3" />,
  Venus: <Circle className="h-3 w-3" />,
  Saturn: <Circle className="h-3 w-3" />,
  Rahu: <Circle className="h-3 w-3" />,
  Ketu: <Circle className="h-3 w-3" />,
};

// Planet colors
const PLANET_COLORS: Record<VastuPlanet, string> = {
  Sun: 'text-orange-500',
  Moon: 'text-slate-400',
  Mars: 'text-red-500',
  Mercury: 'text-green-500',
  Jupiter: 'text-yellow-500',
  Venus: 'text-pink-400',
  Saturn: 'text-indigo-500',
  Rahu: 'text-slate-600',
  Ketu: 'text-amber-600',
};

// Direction labels
const DIRECTION_LABELS: Record<VastuDirection, string> = {
  N: 'North',
  NE: 'North-East',
  E: 'East',
  SE: 'South-East',
  S: 'South',
  SW: 'South-West',
  W: 'West',
  NW: 'North-West',
  CENTER: 'Center (Brahmasthan)',
};

// Score color helper
const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

const getScoreBg = (score: number) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

// Zone Card Component
const ZoneCard = memo(({ zone }: { zone: VastuZone }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', ELEMENT_COLORS[zone.element])}>
              {ELEMENT_ICONS[zone.element]}
            </div>
            <div>
              <p className="font-medium text-sm">{DIRECTION_LABELS[zone.direction]}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {zone.element} • {zone.deity}
                <span className={cn('ml-1 inline-flex items-center gap-0.5', PLANET_COLORS[zone.planet])}>
                  {PLANET_ICONS[zone.planet]} {zone.planet}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('font-bold text-sm', getScoreColor(zone.score))}>{zone.score}%</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 px-3 pb-2 space-y-2">
        {zone.issues.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-red-600">Issues:</p>
            {zone.issues.map((issue, i) => (
              <p key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                {issue}
              </p>
            ))}
          </div>
        )}
        {zone.recommendations.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-green-600">Recommendations:</p>
            {zone.recommendations.map((rec, i) => (
              <p key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                {rec}
              </p>
            ))}
          </div>
        )}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">Ideal uses:</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {zone.idealUses.join(', ')}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
ZoneCard.displayName = 'ZoneCard';

// Remedy Card Component
const RemedyCard = memo(({ remedy }: { remedy: VastuRemedy }) => {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-50 dark:bg-red-900/10',
    medium: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
    low: 'border-l-green-500 bg-green-50 dark:bg-green-900/10',
  };

  return (
    <div className={cn('p-3 rounded-lg border-l-4', priorityColors[remedy.priority])}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {DIRECTION_LABELS[remedy.direction]} • {remedy.category}
        </span>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full',
          remedy.priority === 'high' && 'bg-red-100 text-red-700 dark:bg-red-900/30',
          remedy.priority === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
          remedy.priority === 'low' && 'bg-green-100 text-green-700 dark:bg-green-900/30',
        )}>
          {remedy.priority}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{remedy.issue}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400">{remedy.remedy}</p>
    </div>
  );
});
RemedyCard.displayName = 'RemedyCard';

// Element Balance Chart
const ElementBalanceChart = memo(({ balance }: { balance: Record<VastuElement, number> }) => {
  const elements: VastuElement[] = ['Earth', 'Water', 'Fire', 'Air', 'Space'];

  return (
    <div className="space-y-3">
      {elements.map((element) => (
        <div key={element} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('p-1 rounded', ELEMENT_COLORS[element])}>
                {ELEMENT_ICONS[element]}
              </div>
              <span className="text-sm">{element}</span>
            </div>
            <span className="text-sm font-medium">{balance[element]}%</span>
          </div>
          <Progress
            value={balance[element]}
            className="h-2"
          />
        </div>
      ))}
    </div>
  );
});
ElementBalanceChart.displayName = 'ElementBalanceChart';

// Main Panel Content
interface VastuPanelContentProps {
  data?: unknown;
}

const VastuPanelContent: React.FC<VastuPanelContentProps> = () => {
  const analysis = useVastuStore((state) => state.vastuAnalysis);
  const isAnalyzing = useVastuStore((state) => state.isAnalyzing);
  const error = useVastuStore((state) => state.analysisError);

  const [activeTab, setActiveTab] = React.useState<'overview' | 'directions' | 'remedies' | 'elements'>('overview');

  if (isAnalyzing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Compass className="h-12 w-12 text-[#d4a5a5] animate-spin mb-4" />
        <p className="text-lg font-medium">Analyzing Vastu...</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Calculating directional energies</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-medium text-red-600">Analysis Failed</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Home className="h-12 w-12 text-slate-400 mb-4" />
        <p className="text-lg font-medium">No Analysis Yet</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Search for an address or draw property boundaries to analyze Vastu
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-white/10 px-3">
        {(['overview', 'directions', 'remedies', 'elements'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
              activeTab === tab
                ? 'border-[#d4a5a5] text-[#d4a5a5]'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* Score Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#d4a5a5]/10 to-orange-50 dark:from-[#d4a5a5]/10 dark:to-orange-900/20 border border-[#d4a5a5]/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-[#d4a5a5]">Vastu Score</p>
                  <p className={cn('text-4xl font-bold', getScoreColor(analysis.overallScore))}>
                    {analysis.overallScore}
                  </p>
                </div>
                <Compass className="h-16 w-16 text-[#d4a5a5]/50" />
              </div>
              <Progress
                value={analysis.overallScore}
                className="h-3"
              />
            </div>

            {/* Property Info */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
              <p className="text-sm font-medium mb-1">{analysis.propertyAddress}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Orientation: {analysis.orientation.toFixed(1)}° from North
              </p>
              {analysis.propertyShape && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Shape: {analysis.propertyShape.shape}
                  {analysis.propertyShape.isAuspicious
                    ? ' ✓ Auspicious'
                    : ' ⚠ Needs attention'}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.summary}</p>
              </div>
            </div>

            {/* Entrance Analysis */}
            {analysis.entrance && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                <p className="text-sm font-medium mb-2">Entrance Analysis</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Direction: {DIRECTION_LABELS[analysis.entrance.direction]}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Pada: {analysis.entrance.pada} • Deity: {analysis.entrance.deity}
                </p>
                <p className={cn(
                  'text-xs mt-1',
                  analysis.entrance.isAuspicious ? 'text-green-600' : 'text-red-600'
                )}>
                  {analysis.entrance.isAuspicious ? '✓ Auspicious entrance' : '⚠ Consider remedies'}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'directions' && (
          <div className="space-y-2">
            {analysis.zones.map((zone) => (
              <ZoneCard key={zone.direction} zone={zone} />
            ))}
          </div>
        )}

        {activeTab === 'remedies' && (
          <div className="space-y-3">
            {analysis.remedies.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium text-green-600">Excellent!</p>
                <p className="text-sm text-slate-500">No major remedies needed</p>
              </div>
            ) : (
              analysis.remedies.map((remedy) => (
                <RemedyCard key={remedy.id} remedy={remedy} />
              ))
            )}
          </div>
        )}

        {activeTab === 'elements' && (
          <>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 mb-4">
              <p className="text-sm font-medium mb-1">Pancha Bhuta Balance</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ideal balance has equal distribution of all five elements
              </p>
            </div>
            <ElementBalanceChart balance={analysis.elementBalance} />
          </>
        )}
      </div>
    </div>
  );
};

export default memo(VastuPanelContent);

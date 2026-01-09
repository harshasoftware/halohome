/**
 * ModeChangeCard - Generative UI component for CopilotKit
 *
 * Renders inline in chat when switching astrocartography modes
 * (standard, relocated, local space).
 * Follows landing page aesthetic - clean, minimal, no gradients.
 */

import { motion } from 'framer-motion';
import { Check, Loader2, Globe, MapPin, Compass } from 'lucide-react';

type AstroMode = 'standard' | 'relocated' | 'localSpace';

interface ModeChangeCardProps {
  mode: AstroMode;
  locationName?: string;
  status: 'executing' | 'complete' | 'error';
}

const MODE_CONFIG: Record<AstroMode, {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}> = {
  standard: {
    icon: Globe,
    label: 'Standard Mode',
    description: 'Viewing astrocartography from your birth location',
    color: 'text-blue-500',
  },
  relocated: {
    icon: MapPin,
    label: 'Relocated Mode',
    description: 'Viewing how your chart changes at a new location',
    color: 'text-amber-500',
  },
  localSpace: {
    icon: Compass,
    label: 'Local Space Mode',
    description: 'Viewing azimuth lines radiating from origin',
    color: 'text-violet-500',
  },
};

export function ModeChangeCard({ mode, locationName, status }: ModeChangeCardProps) {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <motion.div
      className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-white/[0.03]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 ${config.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-slate-800 dark:text-white">{config.label}</span>
          {locationName && (
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">
              • {locationName}
            </span>
          )}
        </div>
        {status === 'executing' && (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500" />
        )}
        {status === 'complete' && (
          <Check className="w-4 h-4 text-emerald-500" />
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
        {status === 'executing'
          ? `Switching to ${config.label.toLowerCase()}...`
          : config.description
        }
      </p>
    </motion.div>
  );
}

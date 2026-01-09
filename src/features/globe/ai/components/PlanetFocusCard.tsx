/**
 * PlanetFocusCard - Generative UI component for CopilotKit
 *
 * Renders inline in chat when the AI focuses on a specific planet's lines.
 * Follows landing page aesthetic - clean, minimal, no gradients.
 */

import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { PLANET_COLORS, type Planet } from '@/lib/astro-types';

interface PlanetFocusCardProps {
  planet: string;
  status: 'executing' | 'complete' | 'error';
}

export function PlanetFocusCard({ planet, status }: PlanetFocusCardProps) {
  const planetColor = PLANET_COLORS[planet as Planet] || '#888888';

  return (
    <motion.div
      className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-white/[0.03]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: planetColor }}
        />
        <span className="font-medium text-sm text-slate-800 dark:text-white">{planet}</span>
        {status === 'executing' && (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500 ml-auto" />
        )}
        {status === 'complete' && (
          <Check className="w-4 h-4 text-emerald-500 ml-auto" />
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
        {status === 'executing'
          ? `Focusing map on ${planet} lines...`
          : `Now showing only ${planet} lines on the map`
        }
      </p>
    </motion.div>
  );
}

/**
 * VisibilityToggleCard - Generative UI component for CopilotKit
 *
 * Renders inline in chat when toggling visibility of lines, aspects, parans, etc.
 * Follows landing page aesthetic - clean, minimal, no gradients.
 */

import { motion } from 'framer-motion';
import { Check, Loader2, Eye, EyeOff } from 'lucide-react';

interface VisibilityToggleCardProps {
  feature: string;
  visible: boolean;
  status: 'executing' | 'complete' | 'error';
  description?: string;
}

export function VisibilityToggleCard({
  feature,
  visible,
  status,
  description,
}: VisibilityToggleCardProps) {
  return (
    <motion.div
      className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-white/[0.03]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 ${visible ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </div>
        <span className="font-medium text-sm text-slate-800 dark:text-white flex-1">{feature}</span>
        {status === 'executing' && (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500" />
        )}
        {status === 'complete' && (
          <Check className="w-4 h-4 text-emerald-500" />
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
        {status === 'executing'
          ? `${visible ? 'Showing' : 'Hiding'} ${feature.toLowerCase()}...`
          : description || `${feature} are now ${visible ? 'visible' : 'hidden'} on the map`
        }
      </p>
    </motion.div>
  );
}

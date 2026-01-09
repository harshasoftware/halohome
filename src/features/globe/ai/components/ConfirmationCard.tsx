/**
 * ConfirmationCard - Human-in-the-Loop UI component for CopilotKit
 *
 * Renders inline in chat to confirm destructive or expensive operations
 * before they execute (e.g., creating birth charts, running scout analysis).
 * Follows landing page aesthetic - clean, minimal, no gradients.
 */

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmationCardProps {
  title: string;
  description: string;
  details?: Record<string, string>;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmationCard({
  title,
  description,
  details,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmationCardProps) {
  return (
    <motion.div
      className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div>
        <h4 className="font-semibold text-sm text-slate-800 dark:text-white">{title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>

      {details && Object.keys(details).length > 0 && (
        <div className="bg-slate-100 dark:bg-white/[0.03] rounded-lg p-2.5 text-xs space-y-1.5 border border-slate-200/50 dark:border-white/5">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">{key}:</span>
              <span className="font-medium text-slate-700 dark:text-slate-200 text-right">{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Processing...
            </>
          ) : (
            confirmLabel
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
        >
          {cancelLabel}
        </Button>
      </div>
    </motion.div>
  );
}

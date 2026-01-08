/**
 * FavoriteNoteEditor - Inline note editor for favorite cities
 *
 * Shows notes as text by default, switches to editable textarea on click.
 * Uses useAutoSaveNote for debounced auto-saving.
 *
 * Edge cases handled:
 * - Long notes: maxLength={500} and max-h-[200px] prevent layout issues
 * - Rapid typing: useAutoSaveNote debounces to single save after delay
 * - Network errors: Proper error state with user-friendly message
 * - Memory leaks: Cleanup all timeouts on unmount
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil, Loader2, Check, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAutoSaveNote } from '@/hooks/useAutoSaveNote';
import { cn } from '@/lib/utils';

// Maximum character limit for notes to prevent layout issues
const MAX_NOTES_LENGTH = 500;

interface FavoriteNoteEditorProps {
  /** Unique identifier for the favorite */
  id: string;
  /** Initial notes value */
  initialNotes: string;
  /** Callback to save notes */
  onSave: (id: string, notes: string) => Promise<void>;
}

export const FavoriteNoteEditor: React.FC<FavoriteNoteEditorProps> = ({
  id,
  initialNotes,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const showSavedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up showSaved timeout on unmount to prevent memory leaks
      if (showSavedTimeoutRef.current) {
        clearTimeout(showSavedTimeoutRef.current);
      }
    };
  }, []);

  // Use the auto-save hook with debounced saving
  const { value, setValue, isSaving, hasUnsavedChanges, error } = useAutoSaveNote({
    initialValue: initialNotes,
    saveFn: async (notes: string) => {
      await onSave(id, notes);
      // Show saved indicator briefly after successful save
      if (isMountedRef.current) {
        setShowSaved(true);
        // Clear any existing timeout before setting new one
        if (showSavedTimeoutRef.current) {
          clearTimeout(showSavedTimeoutRef.current);
        }
        showSavedTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setShowSaved(false);
          }
        }, 1500);
      }
    },
    delay: 1500,
  });

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end of text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  // Handle click outside to exit edit mode
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
    },
    [setValue]
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Exit edit mode on Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
      }
    },
    []
  );

  // Render status indicator - subtle icon-based indicators with smooth animations
  const renderStatusIndicator = () => {
    if (isSaving) {
      return (
        <div
          className={cn(
            'flex items-center gap-1 text-slate-400 dark:text-slate-500',
            'animate-in fade-in duration-150'
          )}
          title="Saving..."
        >
          <Loader2 className="w-3 h-3 animate-spin" />
        </div>
      );
    }

    if (showSaved) {
      return (
        <div
          className={cn(
            'flex items-center gap-1 text-green-500 dark:text-green-400',
            'animate-in fade-in zoom-in-50 duration-200'
          )}
          title="Saved"
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </div>
      );
    }

    if (hasUnsavedChanges) {
      return (
        <div
          className={cn(
            'flex items-center',
            'animate-in fade-in duration-150'
          )}
          title="Unsaved changes"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        </div>
      );
    }

    if (error) {
      return (
        <div
          className={cn(
            'flex items-center gap-1 text-red-500 dark:text-red-400',
            'animate-in fade-in duration-150 cursor-help'
          )}
          title="Failed to save. Changes will retry automatically when you continue typing."
        >
          <AlertCircle className="w-3 h-3" />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      className="relative mt-2"
      onClick={handleClick}
    >
      {isEditing ? (
        <div className="space-y-1">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Add notes..."
              maxLength={MAX_NOTES_LENGTH}
              className={cn(
                'min-h-[60px] max-h-[200px] text-sm resize-none pr-6',
                'bg-white dark:bg-slate-800',
                'border-slate-200 dark:border-slate-700',
                'focus:ring-blue-500 focus:border-blue-500',
                'placeholder:text-slate-400 dark:placeholder:text-slate-500'
              )}
              onClick={(e) => e.stopPropagation()}
            />
            {/* Status indicator positioned in top-right corner of textarea */}
            <div className="absolute top-2 right-2 z-10">
              {renderStatusIndicator()}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'group/note relative cursor-pointer rounded-md px-2 py-1.5 -mx-2',
            'transition-colors duration-150',
            'hover:bg-slate-100 dark:hover:bg-slate-800/50'
          )}
        >
          {value ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 pr-8">
              {value}
            </p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic pr-8">
              Add notes...
            </p>
          )}
          {/* Right side indicators container */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Status indicator in view mode - always visible when active */}
            {(isSaving || showSaved || error) && renderStatusIndicator()}
            {/* Pencil icon hint on hover - hidden when status is showing */}
            {!(isSaving || showSaved || error) && (
              <Pencil
                className={cn(
                  'w-3.5 h-3.5 text-slate-400',
                  'opacity-0 group-hover/note:opacity-100',
                  'transition-opacity duration-150'
                )}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoriteNoteEditor;

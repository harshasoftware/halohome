/**
 * FavoriteNoteEditor - Inline note editor for favorite cities
 *
 * Shows notes as text by default, switches to editable textarea on click.
 * Uses useAutoSaveNote for debounced auto-saving.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil, Loader2, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAutoSaveNote } from '@/hooks/useAutoSaveNote';
import { cn } from '@/lib/utils';

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

  // Use the auto-save hook with debounced saving
  const { value, setValue, isSaving, hasUnsavedChanges, error } = useAutoSaveNote({
    initialValue: initialNotes,
    saveFn: async (notes: string) => {
      await onSave(id, notes);
      // Show saved indicator briefly after successful save
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
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

  // Render status indicator
  const renderStatusIndicator = () => {
    if (isSaving) {
      return (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </div>
      );
    }

    if (showSaved) {
      return (
        <div className="flex items-center gap-1 text-xs text-green-500">
          <Check className="w-3 h-3" />
          <span>Saved</span>
        </div>
      );
    }

    if (hasUnsavedChanges) {
      return (
        <span className="text-xs text-amber-500">Unsaved changes</span>
      );
    }

    if (error) {
      return (
        <span className="text-xs text-red-500">Error saving</span>
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
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Add notes..."
            className={cn(
              'min-h-[60px] text-sm resize-none',
              'bg-white dark:bg-slate-800',
              'border-slate-200 dark:border-slate-700',
              'focus:ring-blue-500 focus:border-blue-500',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500'
            )}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex justify-end">
            {renderStatusIndicator()}
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
            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 pr-6">
              {value}
            </p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic pr-6">
              Add notes...
            </p>
          )}
          {/* Pencil icon hint on hover */}
          <Pencil
            className={cn(
              'absolute right-1 top-1/2 -translate-y-1/2',
              'w-3.5 h-3.5 text-slate-400',
              'opacity-0 group-hover/note:opacity-100',
              'transition-opacity duration-150'
            )}
          />
          {/* Status indicator in view mode */}
          {(isSaving || showSaved || error) && (
            <div className="mt-1">
              {renderStatusIndicator()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FavoriteNoteEditor;

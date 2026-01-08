/**
 * ShareModal - Modal for creating share links with privacy options
 *
 * Allows users to share their astrocartography chart with:
 * - Privacy level selection (full, anonymous, partial)
 * - Optional title and description
 * - Copy buttons for share URL and embed code
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import {
  Loader2,
  Copy,
  Check,
  Link2,
  Code2,
  Eye,
  EyeOff,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useBirthData, useAstroVisibility } from '@/stores/astroStore';
import { createShareLink } from '@/services/shareService';
import type { PrivacyLevel, CreateShareResponse } from '@/types/share';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIVACY_OPTIONS: {
  value: PrivacyLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'full',
    label: 'Full Details',
    description: 'Show birth date, time, and exact location',
    icon: <Eye className="w-4 h-4" />,
  },
  {
    value: 'partial',
    label: 'Partial',
    description: 'Show date and general region (no exact time)',
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    value: 'anonymous',
    label: 'Anonymous',
    description: 'Show only the planetary lines (no birth data)',
    icon: <EyeOff className="w-4 h-4" />,
  },
];

export const ShareModal: React.FC<ShareModalProps> = ({ open, onOpenChange }) => {
  const birthData = useBirthData();
  const visibility = useAstroVisibility();

  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('anonymous');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareResult, setShareResult] = useState<CreateShareResponse | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Reset state when modal closes
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setShareResult(null);
      setCopiedUrl(false);
      setCopiedEmbed(false);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  // Create share link
  const handleCreateShare = useCallback(async () => {
    if (!birthData) {
      toast.error('No birth data to share');
      return;
    }

    setLoading(true);

    try {
      const result = await createShareLink({
        birthData: {
          date: birthData.date.toISOString(),
          latitude: birthData.latitude,
          longitude: birthData.longitude,
          localDate: birthData.localDate,
          localTime: birthData.localTime,
          cityName: (birthData as { cityName?: string }).cityName,
        },
        visibilityState: {
          planets: visibility.planets,
          lineTypes: visibility.lineTypes,
          aspects: visibility.aspects,
          parans: visibility.parans,
          zenith: visibility.zenith,
        },
        privacyLevel,
        title: title || undefined,
        description: description || undefined,
      });

      setShareResult(result);
      toast.success('Share link created!');
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  }, [birthData, visibility, privacyLevel, title, description]);

  // Copy handlers
  const handleCopyUrl = useCallback(() => {
    if (!shareResult) return;
    navigator.clipboard.writeText(shareResult.shareUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast.success('Link copied to clipboard');
  }, [shareResult]);

  const handleCopyEmbed = useCallback(() => {
    if (!shareResult) return;
    navigator.clipboard.writeText(shareResult.embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
    toast.success('Embed code copied to clipboard');
  }, [shareResult]);

  // No birth data state
  if (!birthData) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Chart</DialogTitle>
            <DialogDescription>
              Enter your birth data first to create a shareable chart.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground">No birth data available</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Your Chart</DialogTitle>
          <DialogDescription>
            Create a shareable link or embed code for your astrocartography chart.
          </DialogDescription>
        </DialogHeader>

        {/* Share result - show after creation */}
        {shareResult ? (
          <div className="space-y-6">
            {/* Share URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Share Link
              </Label>
              <div className="flex gap-2">
                <Input
                  value={shareResult.shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                >
                  {copiedUrl ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a href={shareResult.shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Embed code */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                Embed Code (for blogs, Reddit, etc.)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={shareResult.embedCode}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyEmbed}
                >
                  {copiedEmbed ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste this code into any website to embed an interactive globe.
              </p>
            </div>

            {/* Create another */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="ghost" onClick={() => setShareResult(null)}>
                Create Another Link
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Creation form */
          <div className="space-y-6">
            {/* Privacy level */}
            <div className="space-y-3">
              <Label>Privacy Level</Label>
              <RadioGroup
                value={privacyLevel}
                onValueChange={(value) => setPrivacyLevel(value as PrivacyLevel)}
                className="grid gap-3"
              >
                {PRIVACY_OPTIONS.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`privacy-${option.value}`}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      privacyLevel === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`privacy-${option.value}`}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Optional title */}
            <div className="space-y-2">
              <Label htmlFor="share-title">Title (optional)</Label>
              <Input
                id="share-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Astrocartography Chart"
                maxLength={100}
              />
            </div>

            {/* Optional description */}
            <div className="space-y-2">
              <Label htmlFor="share-description">Description (optional)</Label>
              <Textarea
                id="share-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Looking for advice on my Venus line in Southeast Asia..."
                maxLength={500}
                rows={3}
              />
            </div>

            {/* Create button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateShare} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Create Share Link
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;

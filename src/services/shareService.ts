import { supabase } from '@/integrations/supabase/client';
import type {
  CreateShareRequest,
  CreateShareResponse,
  ShareLinkData,
} from '@/types/share';

/**
 * Creates a shareable link for an astrocartography chart
 */
export async function createShareLink(
  request: CreateShareRequest
): Promise<CreateShareResponse> {
  const { data, error } = await supabase.functions.invoke('create-share-link', {
    body: request,
  });

  if (error) {
    console.error('Error creating share link:', error);
    throw new Error(error.message || 'Failed to create share link');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as CreateShareResponse;
}

/**
 * Fetches share link data by short code
 */
export async function getShareData(
  shortCode: string,
  incrementView = true
): Promise<ShareLinkData> {
  const { data, error } = await supabase.functions.invoke('get-share-data', {
    body: { shortCode, incrementView },
  });

  if (error) {
    console.error('Error fetching share data:', error);
    throw new Error(error.message || 'Failed to fetch share data');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as ShareLinkData;
}

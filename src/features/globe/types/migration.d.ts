export interface Migration {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  year: number;
  personId?: string;
}

import { PersonData } from '@/types/familyTree';

export interface PersonLocation extends Partial<PersonData> {
  id: string;
  lat: number;
  lng: number;
  label: string;
  avatarUrl?: string;
  count?: number;
  placeName?: string;
}

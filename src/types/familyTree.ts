import { Node, Edge } from '@stubs/xyflow';

export interface PersonData {
  id: string;
  name: string;
  maidenName?: string;
  birthDate?: string;
  birthTime?: string; // For astrocartography - HH:MM format
  deathDate?: string;
  avatar?: string;
  preferredName?: string; // For nicknames or alternative names
  status: 'alive' | 'deceased' | 'stillborn' | 'miscarriage'; // Added new statuses
  gender: 'male' | 'female' | 'other';
  marriages?: Array<{
    spouseId: string;
    marriageDate?: string;
    divorceDate?: string;
  }>;
  locations?: LocationEvent[];
  notes?: string;
  [key: string]: unknown;
}

export interface UnionNodeData {
  label: string;
  parent1Gender: PersonData['gender'];
  parent2Gender: PersonData['gender'];
  type: 'union';
  [key: string]: unknown;
}

export interface LocationEvent {
  type: 'birth' | 'death' | 'residence' | 'citizenship' | 'other'; // Added 'citizenship'
  place: string; // For citizenship, this would be the country
  date?: string; // Optional: date of event or start date for residence/citizenship
  endDate?: string; // Optional: end date for residence
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface FamilyEdgeData {
  type:
    | 'parent-child' // For direct single parent to child connections
    | 'parent-to-union' // For person to union node connections
    | 'union-to-child' // For union node to child connections
    | 'marriage'
    | 'divorce'
    | 'separated'
    | 'common-law'
    | 'engaged'
    | 'godparent' // Represents godparent-godchild link
    | 'guardian'  // Represents guardian-ward link
    | 'dating'
    | 'ex-partner'
    | 'marriage-link'; // Structural link from person to their union node
  label?: string;
  date?: string; // General date for the relationship (e.g., engagement date, start of guardianship, start of dating)
  endDate?: string; // For relationships that have an end (e.g. dating, ex-partner)
  marriageDate?: string; // Specifically for marriage-like relationships
  adoption?: boolean;
  [key: string]: unknown;
}

export interface FamilyTree {
  id: string;
  name: string;
  is_public: boolean;
  is_encrypted: boolean;
  encryption_salt?: string | null;
  created_at: string;
  updated_at: string;
  is_permanent: boolean;
  tree_data: {
    nodes: Node<PersonData>[];
    edges: Edge[];
  };
}

// Corresponds to the `family_members`
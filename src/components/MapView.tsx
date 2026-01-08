import React from 'react';
import { PersonData } from '@/types/familyTree';
import { Node } from '@stubs/xyflow';
import GlobePage from '../features/globe/GlobePage';

import { Edge } from '@stubs/xyflow';

interface MapViewProps {
  onEditPerson: (person: PersonData) => void;
  nodes: Node<PersonData>[];
  edges: Edge[];
  filters: { gender: string; status: string };
  onFilterChange: (filter: string, value: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({ onEditPerson, nodes, edges, filters, onFilterChange }) => {
  return <GlobePage filters={filters} nodes={nodes} edges={edges} onFilterChange={onFilterChange} />;
};

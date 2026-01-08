/**
 * PersonPanelContent - Content for the person info panel in the right panel stack
 *
 * Renders the PersonCard in a scrollable container.
 */

import React from 'react';
import PersonCard from '../PersonCard';
import type { PersonData } from '@/types/familyTree';

interface PersonPanelContentProps {
  person: PersonData;
  onClose: () => void;
}

export const PersonPanelContent: React.FC<PersonPanelContentProps> = ({
  person,
  onClose,
}) => {
  return (
    <div className="h-full overflow-y-auto p-4">
      <PersonCard person={person} onClose={onClose} />
    </div>
  );
};

export default PersonPanelContent;

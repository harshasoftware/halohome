import React, { useRef, useEffect, useState } from 'react';
import { PersonData } from '@/types/familyTree';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from './ui/button';
import { ScrollSyncPane } from 'react-scroll-sync';
import { generateAvatar } from '@/lib/avatar';

interface NamePaneProps {
  persons: PersonData[];
  highlightedPersonId: string | null;
  toggleHighlightPerson: (id: string) => void;
  onEditPerson: (person: PersonData) => void;
  dateAxisHeight: number;
  personTrackHeight: number;
  horizontalPadding: number;
}

export const NamePane: React.FC<NamePaneProps> = ({
  persons,
  highlightedPersonId,
  toggleHighlightPerson,
  onEditPerson,
  dateAxisHeight,
  personTrackHeight,
  horizontalPadding,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const [generatedAvatars, setGeneratedAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    const generateAvatars = async () => {
      const avatars: Record<string, string> = {};
      for (const person of persons) {
        if (person.name && !person.avatar) {
          avatars[person.id] = await generateAvatar(
            person.name,
            person.gender,
            person.birthDate
          );
        }
      }
      setGeneratedAvatars(avatars);
    };
    generateAvatars();
  }, [persons]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        lastY.current = event.touches[0].clientY;
        isDragging.current = true;
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (isDragging.current && event.touches.length === 1) {
        const deltaY = event.touches[0].clientY - lastY.current;
        container.scrollTop -= deltaY;
        lastY.current = event.touches[0].clientY;
      }
    };

    const onTouchEnd = () => {
      isDragging.current = false;
    };
    
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <ScrollSyncPane>
      <div ref={containerRef} className="overflow-y-auto overflow-x-hidden custom-scrollbar h-full">
        <div style={{ height: dateAxisHeight }} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900" />
        {persons.map(person => (
          <div
            key={`${person.id}-name`}
            className={`flex items-center pr-2 transition-opacity duration-300 border-b border-slate-200 dark:border-slate-700/50 ${
              highlightedPersonId && highlightedPersonId !== person.id ? 'opacity-30' : 'opacity-100'
            } ${highlightedPersonId === person.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
            style={{ height: personTrackHeight, paddingLeft: `${horizontalPadding / 4}px` }}
            onClick={() => toggleHighlightPerson(person.id)}
          >
            <Button variant="link" className="p-0 h-auto text-left" onClick={(e) => { e.stopPropagation(); onEditPerson(person); }}>
              <Avatar className="w-8 h-8 mr-2">
                <AvatarImage src={person.avatar || generatedAvatars[person.id]} />
                <AvatarFallback className={`text-xs ${person.gender === 'male' ? 'bg-blue-200' : 'bg-pink-200'}`}>
                  {person.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {person.name}
              </span>
            </Button>
          </div>
        ))}
      </div>
    </ScrollSyncPane>
  );
};

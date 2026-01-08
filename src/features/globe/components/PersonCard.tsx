import React from 'react';
import { PersonData } from '@/types/familyTree';
import { PersonAvatar } from '@/components/PersonDialogParts/PersonAvatar';
import { Button } from '@/components/ui/button';
import {
  X,
  MapPin,
  Cake,
  Skull,
  Clock,
  Building,
  Flag,
  Info,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonCardProps {
  person: PersonData;
  onClose: () => void;
  className?: string;
}

// Helper to format date as 'Jan 1, 1950'
function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Helper to format time as '2:30 PM'
function formatTime(timeStr?: string) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

const PersonCard: React.FC<PersonCardProps> = ({ person, onClose, className }) => {
  const birthLocation = person.locations?.find((loc) => loc.type === 'birth');
  const deathLocation = person.locations?.find((loc) => loc.type === 'death');

  // Detect mobile full-screen mode
  const isMobileSheet = className?.includes('w-full') && className?.includes('h-full');

  return (
    <div
      className={cn(
        isMobileSheet
          ? "relative w-full h-full bg-white dark:bg-slate-800 flex flex-col items-center px-0 pt-2 pb-4 text-base text-slate-800 dark:text-slate-200"
          : "bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-80 text-sm text-slate-800 dark:text-slate-200 max-h-screen flex flex-col",
        className
      )}
    >
      {isMobileSheet && (
        <div className="w-full flex flex-col items-center mb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mt-2 mb-2" />
        </div>
      )}
      <div className={cn(
        isMobileSheet ? "w-full flex flex-col items-center px-3" : "p-4 border-b border-slate-200 dark:border-slate-700"
      )}>
        <div className={cn(
          "flex items-center w-full relative gap-4"
        )}>
          <div className={cn("flex-shrink-0 flex justify-center items-center", isMobileSheet ? "w-16 h-16" : "w-16 h-16 mr-2")}
          >
            <PersonAvatar
              formData={person}
              isUploading={false}
              onAvatarUpload={() => {}}
            />
          </div>
          <div className={cn("flex flex-col justify-center", isMobileSheet ? "flex-1" : "flex-grow")}
          >
            <h3 className={cn("font-bold", isMobileSheet ? "text-xl" : "text-lg")}>{person.name}</h3>
            {person.preferredName && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                (aka {person.preferredName})
              </p>
            )}
            {person.maidenName && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                (nee {person.maidenName})
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size={isMobileSheet ? "lg" : "icon"}
            onClick={onClose}
            className={cn(
              isMobileSheet
                ? "absolute right-2 top-2 w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full shadow-md"
                : "self-start"
            )}
            aria-label="Close"
          >
            <X className={isMobileSheet ? "h-5 w-5" : "h-4 w-4"} />
          </Button>
        </div>
      </div>
      <div className={cn(
        isMobileSheet
          ? "flex-1 w-full overflow-y-auto px-1 py-2 bg-slate-100 dark:bg-slate-900/60 rounded-t-2xl mt-1 flex flex-col items-center"
          : "flex-1 p-4 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto"
      )} style={!isMobileSheet ? { minHeight: 0 } : undefined}>
        <div className={cn(
          isMobileSheet
            ? "w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow px-3 py-6 space-y-5"
            : "space-y-3"
        )}>
          {/* Life Events Section */}
          <div className="space-y-4">
            {person.birthTime && (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <Clock
                    className={cn(
                      isMobileSheet ? "h-6 w-6" : "h-4 w-4",
                      "text-blue-500"
                    )}
                  />
                  <span className={cn(
                    isMobileSheet ? "text-lg font-bold text-slate-800 dark:text-slate-100" : "text-base font-semibold text-slate-800 dark:text-slate-100"
                  )}>
                    Birth Time: {formatTime(person.birthTime)}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
              </>
            )}
            <div className="flex flex-col gap-4">
              {person.birthDate && (
                <div className="flex items-center gap-3">
                  <Cake className={isMobileSheet ? "h-5 w-5 text-slate-500" : "h-4 w-4 text-slate-500"} />
                  <span className={isMobileSheet ? "text-base text-slate-900 dark:text-slate-100" : "text-sm text-slate-900 dark:text-slate-100"}>
                    <span className="font-semibold">Born:</span> {formatDate(person.birthDate)}
                    {birthLocation && (
                      <span className="text-slate-600 dark:text-slate-300"> in <span className="font-medium underline underline-offset-2">{birthLocation.place}</span></span>
                    )}
                  </span>
                </div>
              )}
              {person.deathDate && (
                <div className="flex items-center gap-3">
                  <Skull className={isMobileSheet ? "h-5 w-5 text-slate-500" : "h-4 w-4 text-slate-500"} />
                  <span className={isMobileSheet ? "text-base text-slate-900 dark:text-slate-100" : "text-sm text-slate-900 dark:text-slate-100"}>
                    <span className="font-semibold">Died:</span> {formatDate(person.deathDate)}
                    {deathLocation && (
                      <span className="text-slate-600 dark:text-slate-300"> in <span className="font-medium underline underline-offset-2">{deathLocation.place}</span></span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Locations Section */}
          {person.locations && person.locations.length > 0 && (
            <div>
              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
              <h4 className={cn(isMobileSheet ? "font-bold text-base mb-2 text-slate-800 dark:text-slate-100" : "font-semibold text-xs mb-1 text-slate-800 dark:text-slate-100")}>Locations</h4>
              <div className="relative pl-6">
                {/* Vertical line */}
                <div className="absolute left-2 top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700 z-0" style={{height: 'calc(100% - 2rem)'}} />
                <ul className={cn(isMobileSheet ? "space-y-6" : "space-y-4")}>
                  {person.locations.map((loc, index) => (
                    <li key={index} className="relative z-10 flex flex-col gap-1 mb-2">
                      {/* Timeline marker */}
                      <span className={cn(
                        "absolute -left-6 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        index === 0 ? "bg-orange-500 border-orange-500" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                      )} />
                      <span className="capitalize font-semibold text-slate-700 dark:text-slate-200">{loc.type}</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        <span className="underline underline-offset-2 decoration-2">{loc.place}</span>
                        {loc.date && (
                          <span className="ml-2 text-xs text-slate-500">{formatDate(loc.date)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {/* Notes Section */}
          {person.notes && (
            <div>
              <div className="border-t border-slate-200 dark:border-slate-700 my-3" />
              <div className="flex items-start gap-3">
                <Info className={isMobileSheet ? "h-5 w-5 text-slate-500 mt-1" : "h-4 w-4 mr-2 mt-0.5 text-slate-500"} />
                <div className="flex-1">
                  <h4 className={isMobileSheet ? "font-bold text-lg" : "font-semibold"}>Notes</h4>
                  <p className="italic text-slate-500 dark:text-slate-400">
                    {person.notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonCard;

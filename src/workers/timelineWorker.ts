// src/workers/timelineWorker.ts
// Web Worker for heavy timeline computations: event extraction and tick calculation.

import { format, addYears, subYears, getYear } from 'date-fns';

// Minimal types for worker context
export interface Marriage {
  spouseId: string;
  marriageDate?: string;
  divorceDate?: string;
}
export interface LocationEvent {
  type: string;
  place: string;
  date?: string;
  endDate?: string;
}
export interface PersonData {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  status?: string;
  birthDate?: string;
  deathDate?: string;
  marriages?: Marriage[];
  locations?: LocationEvent[];
}
export interface TimelineEvent {
  id: string;
  personId: string;
  personName: string;
  personGender?: 'male' | 'female' | 'other';
  type: string;
  date: string;
  endDate?: string;
  title: string;
  details?: string;
}
export interface TimelineTick {
  date: string;
  label: string;
  isMonth: boolean;
}

interface ComputeRequest {
  type: 'compute';
  persons: PersonData[];
  filters: { gender: string; status: string };
  zoomLevel: number;
  windowWidth: number;
}

interface ComputeResult {
  type: 'result';
  allEvents: TimelineEvent[];
  minDate: string;
  maxDate: string;
  ticks: TimelineTick[];
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function buildEvents(persons: PersonData[]): { allEvents: TimelineEvent[]; minDate: Date; maxDate: Date } {
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;
  const events: TimelineEvent[] = [];

  persons.forEach(person => {
    const common = { personId: person.id, personName: person.name, personGender: person.gender };
    if (person.birthDate) {
      const d = parseDate(person.birthDate);
      if (d) {
        events.push({ ...common, id: `${person.id}-birth`, date: d.toISOString(), type: 'birth', title: `Born` });
        if (!earliestDate || d < earliestDate) earliestDate = d;
        if (!latestDate || d > latestDate) latestDate = d;
      }
    }
    if (person.deathDate) {
      const d = parseDate(person.deathDate);
      if (d) {
        events.push({ ...common, id: `${person.id}-death`, date: d.toISOString(), type: 'death', title: `Died` });
        if (!earliestDate || d < earliestDate) earliestDate = d;
        if (!latestDate || d > latestDate) latestDate = d;
      }
    }
    person.marriages?.forEach((m, i) => {
      if (m.marriageDate) {
        const marriageStartDate = parseDate(m.marriageDate);
        if (marriageStartDate) {
          events.push({ ...common, id: `${person.id}-marriage-start-${i}`, date: marriageStartDate.toISOString(), type: 'marriage', title: `Married`, details: `Spouse: ${m.spouseId}` });
          if (!earliestDate || marriageStartDate < earliestDate) earliestDate = marriageStartDate;
          if (!latestDate || marriageStartDate > latestDate) latestDate = marriageStartDate;
          let marriageEndDate: Date | undefined = undefined;
          if (m.divorceDate) {
            marriageEndDate = parseDate(m.divorceDate) || undefined;
          }
          if (marriageEndDate && marriageEndDate > marriageStartDate) {
            events.push({ ...common, id: `${person.id}-marriage-duration-${i}`, date: marriageStartDate.toISOString(), endDate: marriageEndDate.toISOString(), type: 'marriage_duration', title: `Marriage`, details: `From ${marriageStartDate.toISOString()} to ${marriageEndDate.toISOString()}` });
            if (!latestDate || marriageEndDate > latestDate) latestDate = marriageEndDate;
          }
        }
      }
    });
    person.locations?.forEach((loc, i) => {
      if (loc.date) {
        const d = parseDate(loc.date);
        if (d) {
          const type = loc.type === 'citizenship' ? 'citizenship' : 'location';
          events.push({ ...common, id: `${person.id}-${type}-${i}`, date: d.toISOString(), endDate: loc.endDate ? parseDate(loc.endDate)?.toISOString() : undefined, type, title: `${type === 'citizenship' ? 'Citizenship' : 'Location'}: ${loc.place}`, details: loc.place });
          if (!earliestDate || d < earliestDate) earliestDate = d;
          if (loc.endDate) {
            const ed = parseDate(loc.endDate);
            if (ed && (!latestDate || ed > latestDate)) latestDate = ed;
          } else {
            if (!latestDate || d > latestDate) latestDate = d;
          }
        }
      }
    });
  });
  if (!earliestDate || !latestDate) {
    earliestDate = subYears(new Date(), 50);
    latestDate = new Date();
  } else {
    earliestDate = subYears(earliestDate, 5);
    latestDate = addYears(latestDate, 5);
  }
  return { allEvents: events, minDate: earliestDate, maxDate: latestDate };
}

function buildTicks(minDate: Date, maxDate: Date, zoomLevel: number): TimelineTick[] {
  const ticks: TimelineTick[] = [];
  const startYear = getYear(minDate);
  const endYear = getYear(maxDate);
  const visibleYearSpan = (endYear - startYear) / zoomLevel;

  let yearStep = 1;
  if (visibleYearSpan > 200) yearStep = 20;
  else if (visibleYearSpan > 100) yearStep = 10;
  else if (visibleYearSpan > 50) yearStep = 5;
  else if (visibleYearSpan > 20) yearStep = 2;

  for (let year = startYear; year <= endYear; year += yearStep) {
    const date = new Date(year, 0, 1);
    ticks.push({ date: date.toISOString(), label: format(date, 'yyyy'), isMonth: false });
  }

  // Add month ticks if zoomed in enough
  if (visibleYearSpan <= 5) {
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        if (month > 0) {
          const date = new Date(year, month, 1);
          if (date >= minDate && date <= maxDate) {
            ticks.push({ date: date.toISOString(), label: format(date, 'MMM'), isMonth: true });
          }
        }
      }
    }
  }
  return ticks;
}

self.onmessage = function (event: MessageEvent<ComputeRequest>) {
  const { type, persons, filters, zoomLevel } = event.data;
  if (type !== 'compute') return;
  try {
    // Filter persons
    const filteredPersons = persons.filter(person => {
      if (filters.gender && filters.gender !== 'all' && person.gender !== filters.gender) return false;
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'alive' && person.status?.toLowerCase() !== 'alive') return false;
        if (filters.status === 'dead' && person.status?.toLowerCase() === 'alive') return false;
      }
      return true;
    });
    const { allEvents, minDate, maxDate } = buildEvents(filteredPersons);
    const ticks = buildTicks(minDate, maxDate, zoomLevel);
    const result: ComputeResult = {
      type: 'result',
      allEvents,
      minDate: minDate.toISOString(),
      maxDate: maxDate.toISOString(),
      ticks,
    };
    self.postMessage(result);
  } catch (error: Error) {
    self.postMessage({ type: 'error', error: error.message || String(error) });
  }
}; 
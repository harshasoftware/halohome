/**
 * Manages filter state for the family tree (gender, status).
 *
 * @returns {{
 *   filters: { gender: string, status: string },
 *   setFilters: (filters: { gender: string, status: string }) => void
 * }}
 */
import { useState } from 'react';

export function useFilterState() {
  const [filters, setFilters] = useState({ gender: 'all', status: 'all' });
  return { filters, setFilters };
} 
import { useState } from 'react';

interface Filters {
  gender?: 'all' | 'male' | 'female';
  status?: 'all' | 'alive' | 'dead';
}

const useFilters = () => {
  const [filters, setFilters] = useState<Filters>({});

  const updateFilters = (filter: keyof Filters, value: Filters[keyof Filters]) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  };

  return { filters, updateFilters };
};

export default useFilters;

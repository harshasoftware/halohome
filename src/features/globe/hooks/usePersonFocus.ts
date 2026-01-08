import { useState } from 'react';

const usePersonFocus = () => {
  const [focusedPerson, setFocusedPerson] = useState<string | null>(null);

  const focusOnPerson = (personId: string) => {
    setFocusedPerson(personId);
  };

  const clearFocus = () => {
    setFocusedPerson(null);
  };

  return { focusedPerson, focusOnPerson, clearFocus };
};

export default usePersonFocus;

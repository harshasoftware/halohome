
export const getAvatarEmoji = (gender: 'male' | 'female' | 'other' = 'other', birthDate?: string): string => {
  const age = birthDate ? new Date().getFullYear() - new Date(birthDate).getFullYear() : -1;

  if (gender === 'male') {
    if (age < 0) return '👨'; 
    if (age <= 12) return '👦';
    if (age <= 18) return '🧑';
    if (age <= 60) return '👨';
    return '👴';
  }

  if (gender === 'female') {
    if (age < 0) return '👩';
    if (age <= 18) return '👧';
    if (age <= 60) return '👩';
    return '👵';
  }

  // Gender 'other' or not specified
  if (age < 0) return '👤';
  if (age <= 18) return '🧒';
  return '👤';
};

 import React, { useEffect, useState } from 'react';
import { createAvatar } from '@dicebear/core';
import { bigSmile } from '@dicebear/collection';

interface GenderIconProps {
  gender: 'male' | 'female';
}

export const GenderIcon: React.FC<GenderIconProps> = ({ gender }) => {
  const [avatarUri, setAvatarUri] = useState<string>('');

  useEffect(() => {
    const generate = async () => {
      const avatar = createAvatar(bigSmile, {
        seed: gender === 'female' ? 'Sadie' : 'Ryan',
        eyes: ['cheery'],
        mouth: ['openedSmile'],
      });
      const uri = await avatar.toDataUri();
      setAvatarUri(uri);
    };
    generate();
  }, [gender]);

  return (
    <img src={avatarUri || undefined} alt={gender} className="w-12 h-12" />
  );
};

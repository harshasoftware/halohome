import React, { useEffect, useState } from 'react';
import { createAvatar } from '@dicebear/core';
import { bigSmile } from '@dicebear/collection';

interface StatusIconProps {
  status: 'alive' | 'dead';
}

export const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  const [avatarUri, setAvatarUri] = useState<string>('');

  useEffect(() => {
    const generate = async () => {
      const avatar = createAvatar(bigSmile, {
        seed: status,
        eyes: [status === 'alive' ? 'cheery' : 'sleepy'],
        mouth: [status === 'alive' ? 'openedSmile' : 'openSad'],
        accessoriesProbability: 0,
      });
      const uri = await avatar.toDataUri();
      setAvatarUri(uri);
    };
    generate();
  }, [status]);

  return (
    <img src={avatarUri || undefined} alt={status} className="w-12 h-12" />
  );
};

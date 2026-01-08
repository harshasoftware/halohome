import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createAvatar } from '@dicebear/core';
import { bigSmile } from '@dicebear/collection';

const AVATAR_SEEDS = [
  'avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5'
];

const NotFound = () => {
  const location = useLocation();
  const [avatarUris, setAvatarUris] = useState<string[]>([]);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  useEffect(() => {
    const loadAvatars = async () => {
      const uris = await Promise.all(
        AVATAR_SEEDS.map(async (seed) => {
          const avatar = createAvatar(bigSmile, { seed });
          return await avatar.toDataUri();
        })
      );
      setAvatarUris(uris);
    };
    loadAvatars();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="text-center mb-8">
        <h1 className="text-7xl font-extrabold mb-2 text-orange-500 tracking-tight drop-shadow-lg">404</h1>
        <p className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Page Not Found</p>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">Oops! The page you're looking for doesn't exist.<br/>But here are some friendly faces to cheer you up!</p>
        <Link to="/" className="inline-block mt-4 px-6 py-3 rounded-lg bg-orange-500 text-white font-bold shadow hover:bg-orange-600 transition">Return to Home</Link>
      </div>
      <div className="flex flex-row gap-4 items-end animate-bounce-slow">
        {avatarUris.map((uri, i) => (
          <img
            key={i}
            src={uri}
            alt="DiceBear avatar"
            className="w-20 h-20 rounded-full shadow-lg border-2 border-white dark:border-slate-800 bg-white"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        .animate-bounce-slow > img {
          animation: bounce-slow 2.2s infinite cubic-bezier(.68,-0.55,.27,1.55);
        }
      `}</style>
    </div>
  );
};

export default NotFound;

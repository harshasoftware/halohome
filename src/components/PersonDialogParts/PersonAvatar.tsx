
import React, { useRef, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PersonData } from '@/types/familyTree';
import { Upload, Loader2 } from 'lucide-react';
import { generateAvatar } from '@/lib/avatar';

interface PersonAvatarProps {
  formData: Partial<PersonData>;
  isUploading: boolean;
  onAvatarUpload: (base64: string) => void;
}

export const PersonAvatar: React.FC<PersonAvatarProps> = ({ formData, isUploading, onAvatarUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | undefined>();
  const [defaultAvatar, setDefaultAvatar] = useState<string | undefined>();

  // Utility to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    // Generate a default avatar immediately if no data is present
    if (!formData.name && !formData.avatar && !defaultAvatar) {
      generateAvatar('defaultsmile').then(setDefaultAvatar);
    }
  }, [formData.name, formData.avatar, defaultAvatar]);

  useEffect(() => {
    if (formData.name && !formData.avatar) {
      generateAvatar(
        formData.name,
        formData.gender,
        formData.birthDate
      ).then(setGeneratedAvatar);
    }
  }, [formData.name, formData.gender, formData.birthDate, formData.avatar]);

  const avatarSrc = formData.avatar || generatedAvatar || defaultAvatar;

  return (
    <div className="flex justify-center mb-4">
      <div className="relative group">
        <Avatar className="w-20 h-20 border-4 border-slate-200 dark:border-slate-700">
          <AvatarImage src={avatarSrc} alt={formData.name || 'Default Avatar'} />
          <AvatarFallback className="text-3xl bg-transparent">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              // Show nothing if not uploading and avatar is present
              <span />
            )}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full transition-all duration-200"
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          onChange={async (e) => {
            if (e.target.files) {
              const file = e.target.files[0];
              const base64 = await fileToBase64(file);
              onAvatarUpload(base64);
            }
          }}
          disabled={isUploading}
        />
      </div>
    </div>
  );
};

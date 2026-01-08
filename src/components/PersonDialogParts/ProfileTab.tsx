
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PersonData } from '@/types/familyTree';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProfileTabProps {
  formData: Partial<PersonData>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<PersonData>>>;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ formData, setFormData }) => {
  // Add controlled open state for gender and status selects
  const [genderOpen, setGenderOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter full name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferredName">Preferred Name / Nickname (optional)</Label>
        <Input
          id="preferredName"
          value={formData.preferredName || ''}
          onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
          placeholder="e.g., Mike, Liz"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          {isMobile ? (
            <select
              id="gender"
              value={formData.gender || ''}
              onChange={e => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
              className="block w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
            >
              <option value="" disabled>Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          ) : (
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value as 'male' | 'female' | 'other' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          {isMobile ? (
            <select
              id="status"
              value={formData.status || ''}
              onChange={e => setFormData({ ...formData, status: e.target.value as 'alive' | 'deceased' | 'stillborn' | 'miscarriage' })}
              className="block w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
            >
              <option value="" disabled>Select status</option>
              <option value="alive">Alive</option>
              <option value="deceased">Deceased</option>
              <option value="stillborn">Stillborn</option>
              <option value="miscarriage">Miscarriage</option>
            </select>
          ) : (
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as 'alive' | 'deceased' | 'stillborn' | 'miscarriage' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alive">Alive</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
                <SelectItem value="stillborn">Stillborn</SelectItem>
                <SelectItem value="miscarriage">Miscarriage</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {formData.gender === 'female' && (
        <div className="space-y-2">
          <Label htmlFor="maidenName">Maiden Name (optional)</Label>
          <Input
            id="maidenName"
            value={formData.maidenName || ''}
            onChange={(e) => setFormData({ ...formData, maidenName: e.target.value })}
            placeholder="Enter maiden name"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="birthDate">Birth Date</Label>
          <Input
            id="birthDate"
            type="date"
            value={formData.birthDate || ''}
            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
          />
        </div>

        {formData.status === 'deceased' && (
          <div className="space-y-2">
            <Label htmlFor="deathDate">Death Date</Label>
            <Input
              id="deathDate"
              type="date"
              value={formData.deathDate || ''}
              onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
            />
          </div>
        )}
        {(formData.status === 'stillborn' || formData.status === 'miscarriage') && !formData.birthDate && (
          <div className="space-y-2">
            <Label htmlFor="eventDate">Date of Event</Label>
            <Input
              id="eventDate"
              type="date"
              value={formData.birthDate || ''}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value, deathDate: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="e.g., Cause of death, adoption info"
        />
      </div>
    </div>
  );
};

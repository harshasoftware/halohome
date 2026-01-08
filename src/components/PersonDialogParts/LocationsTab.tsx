
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LocationInput from './LocationInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PersonData, LocationEvent } from '@/types/familyTree';
import { Trash2, Upload, PlusCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface LocationsTabProps {
  formData: Partial<PersonData>;
  newLocation: Partial<LocationEvent>;
  setNewLocation: React.Dispatch<React.SetStateAction<Partial<LocationEvent>>>;
  editingLocationIndex: number | null;
  onAddOrUpdate: () => void;
  onEdit: (location: LocationEvent | null, index: number) => void;
  onRemove: (index: number) => void;
  onCancelEdit: () => void;
}

export const LocationsTab: React.FC<LocationsTabProps> = ({
  formData,
  newLocation,
  setNewLocation,
  editingLocationIndex,
  onAddOrUpdate,
  onEdit,
  onRemove,
  onCancelEdit
}) => {
  const [typeOpen, setTypeOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      <Label>Locations</Label>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(formData.locations || []).map((loc, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-sm">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{loc.place}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {loc.type}
                    {loc.date ? ` - ${new Date(loc.date).toLocaleDateString()}` : ''}
                    {loc.endDate ? ` to ${new Date(loc.endDate).toLocaleDateString()}` : ''}
                  </p>
                  {loc.notes && <p className="text-xs italic text-slate-500 dark:text-slate-400">{loc.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(formData.locations?.[index], index)}>
                    <Upload className="w-3 h-3 text-blue-500" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {(!formData.locations || formData.locations.length === 0) && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No locations recorded.</p>
            )}
          </div>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200">
              {editingLocationIndex !== null ? 'Edit Location' : 'Add New Location'}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="locationType" className="text-xs">Type</Label>
                {isMobile ? (
                  <select
                    id="locationType"
                    value={newLocation.type || ''}
                    onChange={e => setNewLocation({ ...newLocation, type: e.target.value as LocationEvent['type'] })}
                    className="block w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    <option value="" disabled>Select type</option>
                    <option value="birth">Birth</option>
                    <option value="death">Death</option>
                    <option value="residence">Residence</option>
                    <option value="citizenship">Citizenship</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <Select
                    value={newLocation.type}
                    onValueChange={(value) => setNewLocation({ ...newLocation, type: value as LocationEvent['type'] })}
                  >
                    <SelectTrigger id="locationType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birth">Birth</SelectItem>
                      <SelectItem value="death">Death</SelectItem>
                      <SelectItem value="residence">Residence</SelectItem>
                      <SelectItem value="citizenship">Citizenship</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="locationPlace" className="text-xs">
                  {newLocation.type === 'citizenship' ? 'Country' : 'Place (City, Country)'}
                </Label>
                <LocationInput
                  value={newLocation.place || ''}
                  onChange={(location) => {
                    setNewLocation({ ...newLocation, ...location });
                  }}
                  className="w-full"
                  lat={newLocation.lat}
                  lng={newLocation.lng}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="locationDate" className="text-xs">
                  {newLocation.type === 'citizenship' ? 'Acquired Date (optional)' : 'Date / Start Date'}
                </Label>
                <Input
                  id="locationDate"
                  type="date"
                  value={newLocation.date || ''}
                  onChange={e => setNewLocation({ ...newLocation, date: e.target.value })}
                />
              </div>
              {(newLocation.type === 'residence') && (
                <div className="space-y-1">
                  <Label htmlFor="locationEndDate" className="text-xs">End Date (Residence)</Label>
                  <Input
                    id="locationEndDate"
                    type="date"
                    value={newLocation.endDate || ''}
                    onChange={e => setNewLocation({ ...newLocation, endDate: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="locationNotes" className="text-xs">Notes (optional)</Label>
              <Textarea
                id="locationNotes"
                value={newLocation.notes || ''}
                onChange={e => setNewLocation({ ...newLocation, notes: e.target.value })}
                placeholder="e.g., Hospital name, address details"
                rows={2}
              />
            </div>
            <Button type="button" size="sm" className="w-full" onClick={onAddOrUpdate}>
              {editingLocationIndex !== null ? 'Update Location' : 'Add Location'}
              <PlusCircle className="w-4 h-4 ml-2" />
            </Button>
            {editingLocationIndex !== null && (
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={onCancelEdit}>
                Cancel Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

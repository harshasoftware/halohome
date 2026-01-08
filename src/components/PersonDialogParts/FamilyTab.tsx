
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PersonData } from '@/types/familyTree';
import { Node } from '@stubs/xyflow';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface FamilyTabProps {
  formData: Partial<PersonData>;
  allNodes: Node<PersonData>[];
  potentialSpouses: PersonData[];
  newSpouseId: string;
  setNewSpouseId: (id: string) => void;
  newMarriageDate: string;
  setNewMarriageDate: (date: string) => void;
  onAddMarriage: () => void;
  onRemoveMarriage: (id: string) => void;
}

export const FamilyTab: React.FC<FamilyTabProps> = ({
  formData,
  allNodes,
  potentialSpouses,
  newSpouseId,
  setNewSpouseId,
  newMarriageDate,
  setNewMarriageDate,
  onAddMarriage,
  onRemoveMarriage,
}) => {
  // Add controlled open state for spouse select
  const [spouseOpen, setSpouseOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="space-y-2">
      <Label>Marriages</Label>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {formData.marriages && formData.marriages.length > 0 ? (
              formData.marriages.map(marriage => {
                const spouse = allNodes.find(n => n.id === marriage.spouseId)?.data;
                return (
                  <div key={marriage.spouseId} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-sm">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{spouse?.name || 'Unknown Person'}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {marriage.marriageDate ? new Date(marriage.marriageDate).toLocaleDateString() : 'Date unknown'}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveMarriage(marriage.spouseId)}>
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No marriages recorded.</p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200">Add New Marriage</h4>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label htmlFor="spouse" className="text-xs">Spouse</Label>
                {isMobile ? (
                  <select
                    id="spouse"
                    value={newSpouseId || ''}
                    onChange={e => setNewSpouseId(e.target.value)}
                    className="block w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    <option value="" disabled>Select a spouse</option>
                    {potentialSpouses.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <Select
                    value={newSpouseId}
                    onValueChange={setNewSpouseId}
                  >
                    <SelectTrigger id="spouse">
                      <SelectValue placeholder="Select a spouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {potentialSpouses.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="marriageDate" className="text-xs">Date</Label>
                <Input id="marriageDate" type="date" value={newMarriageDate} onChange={e => setNewMarriageDate(e.target.value)} />
              </div>
            </div>
            <Button type="button" size="sm" className="w-full" onClick={onAddMarriage}>Add Marriage</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

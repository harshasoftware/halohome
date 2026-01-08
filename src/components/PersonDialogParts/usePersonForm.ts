import { useState, useEffect, useMemo, useCallback } from 'react';
import { PersonData, LocationEvent } from '@/types/familyTree';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth-context';
import { supabase } from '@/integrations/supabase/client';
import { Node } from '@stubs/xyflow';
import { encryptFile, decryptFile } from '@/lib/encryption';
import { saveAvatarToIndexedDB, getAvatarFromIndexedDB, deleteAvatarFromIndexedDB } from '@/lib/avatarDB';

const initialFormData: Partial<PersonData> = {
    name: '',
    maidenName: '',
    preferredName: '',
    gender: 'male',
    status: 'alive',
    birthDate: '',
    deathDate: '',
    locations: [],
    avatar: '',
    notes: '',
    marriages: [],
};

const initialLocationState = { type: 'residence' as LocationEvent['type'], place: '', date: '' };

export const usePersonForm = (
    person: PersonData | null | undefined, 
    allNodes: Node<PersonData>[],
    projectId: string | null,
    isPermanent: boolean,
    encryptionKey: CryptoKey | null
) => {
    const { user } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState<Partial<PersonData>>(initialFormData);
    const [newLocation, setNewLocation] = useState<Partial<LocationEvent>>(initialLocationState);
    const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);
    const [newSpouseId, setNewSpouseId] = useState('');
    const [newMarriageDate, setNewMarriageDate] = useState('');

    useEffect(() => {
        let objectUrl: string | null = null;
        const loadAvatar = async () => {
            if (!person) return;
            const currentPersonData = { ...person, marriages: person.marriages || [], locations: person.locations || [] };
            if (projectId && person.id) {
                // Try IndexedDB first
                const cachedBlob = await getAvatarFromIndexedDB(projectId, person.id);
                if (cachedBlob) {
                    objectUrl = URL.createObjectURL(cachedBlob);
                    currentPersonData.avatar = objectUrl;
                    setFormData(currentPersonData);
                    return;
                }
            }
            if (isPermanent && encryptionKey && person.avatar && person.avatar.includes('/')) {
                try {
                    const response = await supabase.storage.from('encrypted-avatars').download(person.avatar);
                    if (response.data) {
                        // Decrypt if needed
                        const decryptedBuffer = await decryptFile(encryptionKey, response.data);
                        const fileExt = person.avatar.split('.').pop()?.toLowerCase() || 'png';
                        const mimeType = `image/${fileExt}`;
                        const blob = new Blob([decryptedBuffer], { type: mimeType });
                        objectUrl = URL.createObjectURL(blob);
                        currentPersonData.avatar = objectUrl;
                        // Cache in IndexedDB as File
                        if (projectId && person.id) {
                            const file = new File([blob], `${person.id}.${fileExt}`, { type: mimeType, lastModified: Date.now() });
                            await saveAvatarToIndexedDB(projectId, person.id, file);
                        }
                    }
                } catch (e) {
                    console.error("Failed to decrypt and load avatar", e);
                    toast.error("Failed to load encrypted avatar.");
                    currentPersonData.avatar = '';
                }
            } else if (isPermanent && person.avatar && person.avatar.startsWith('http')) {
                try {
                    const response = await fetch(person.avatar);
                    const blob = await response.blob();
                    objectUrl = URL.createObjectURL(blob);
                    currentPersonData.avatar = objectUrl;
                    if (projectId && person.id) {
                        const fileExt = person.avatar.split('.').pop()?.toLowerCase() || 'png';
                        const mimeType = blob.type || `image/${fileExt}`;
                        const file = new File([blob], `${person.id}.${fileExt}`, { type: mimeType, lastModified: Date.now() });
                        await saveAvatarToIndexedDB(projectId, person.id, file);
                    }
                } catch (e) {
                    console.error("Failed to fetch and cache avatar", e);
                    currentPersonData.avatar = '';
                }
            }
            setFormData(currentPersonData);
        };
        if (person) {
            loadAvatar();
        } else {
            setFormData(initialFormData);
        }
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [person, encryptionKey, projectId, isPermanent]);

    // Change handleAvatarUpload to accept a base64 string
    const handleAvatarUpload = useCallback(async (base64: string) => {
        if (!base64) return;
        setIsUploading(true);
        setFormData(prev => ({ ...prev, avatar: base64 }));
        try {
            if (projectId && person?.id) {
                // Clean up old avatar before saving new one
                await deleteAvatarFromIndexedDB(projectId, person.id);
                // Convert base64 to Blob for IndexedDB
                const res = await fetch(base64);
                const blob = await res.blob();
                const file = new File([blob], `${person.id}.png`, { type: blob.type, lastModified: Date.now() });
                await saveAvatarToIndexedDB(projectId, person.id, file);
            }
            if (isPermanent && user) {
                // Convert base64 to Blob/File for upload
                const res = await fetch(base64);
                const blob = await res.blob();
                const fileName = `${person?.id || `new_person_${Date.now()}`}.png`;
                const file = new File([blob], fileName, { type: blob.type, lastModified: Date.now() });
                if (encryptionKey) {
                    const encryptedFileBlob = await encryptFile(encryptionKey, file);
                    const filePath = `${user.id}/${fileName}`;
                    const { error } = await supabase.storage
                        .from('encrypted-avatars')
                        .upload(filePath, encryptedFileBlob, { upsert: true });
                    if (error) throw error;
                    setFormData(prev => ({ ...prev, avatar: filePath }));
                    toast.success('Encrypted avatar uploaded successfully!');
                } else {
                    const { data, error } = await supabase.storage
                        .from('avatars')
                        .upload(fileName, file, { upsert: true });
                    if (error) throw error;
                    const { data: { publicUrl } } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(data.path);
                    setFormData(prev => ({ ...prev, avatar: publicUrl }));
                    toast.success('Avatar uploaded successfully!');
                }
            } else if (!isPermanent) {
                toast.success('Avatar saved locally for this session.');
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error('Avatar upload failed: ' + error.message);
            } else {
                toast.error('Avatar upload failed.');
            }
            setFormData(prev => ({ ...prev, avatar: person?.avatar || '' }));
        } finally {
            setIsUploading(false);
        }
    }, [person, encryptionKey, user, projectId, isPermanent]);

    const handleAddMarriage = useCallback(() => {
        if (!newSpouseId) {
            toast.warning('Please select a spouse.');
            return;
        }
        setFormData(prev => {
            const newMarriages = [
                ...(prev.marriages || []),
                { spouseId: newSpouseId, marriageDate: newMarriageDate },
            ];
            return { ...prev, marriages: newMarriages };
        });
        setNewSpouseId('');
        setNewMarriageDate('');
    }, [newSpouseId, newMarriageDate]);

    const handleRemoveMarriage = useCallback((spouseId: string) => {
        setFormData(prev => {
            const newMarriages = (prev.marriages || []).filter(m => m.spouseId !== spouseId);
            return { ...prev, marriages: newMarriages };
        });
    }, []);

    const handleAddOrUpdateLocation = useCallback(() => {
        if (!newLocation.place || !newLocation.type) {
            toast.warning('Please enter place and type for the location.');
            return;
        }
        setFormData(prev => {
            const updatedLocations = [...(prev.locations || [])];
            if (editingLocationIndex !== null) {
                updatedLocations[editingLocationIndex] = newLocation as LocationEvent;
            } else {
                updatedLocations.push(newLocation as LocationEvent);
            }
            return { ...prev, locations: updatedLocations };
        });
        setNewLocation(initialLocationState);
        setEditingLocationIndex(null);
    }, [newLocation, editingLocationIndex]);

    const handleEditLocation = useCallback((index: number) => {
        setNewLocation(() => {
            // Use a functional update to avoid direct dependency on formData
            return { ...(person?.locations?.[index] || {}) };
        });
        setEditingLocationIndex(index);
    }, [person]);

    const handleRemoveLocation = useCallback((index: number) => {
        setFormData(prev => {
            const updatedLocations = (prev.locations || []).filter((_, i) => i !== index);
            return { ...prev, locations: updatedLocations };
        });
        if (editingLocationIndex === index) {
            setNewLocation(initialLocationState);
            setEditingLocationIndex(null);
        }
    }, [editingLocationIndex]);

    const cancelEditLocation = useCallback(() => {
        setEditingLocationIndex(null);
        setNewLocation(initialLocationState);
    }, []);

    const potentialSpouses = useMemo(() => allNodes
        .filter(node =>
            node.id !== person?.id &&
            node.type === 'person' &&
            !formData.marriages?.some(m => m.spouseId === node.id)
        )
        .map(node => node.data as PersonData), [allNodes, person, formData.marriages]);

    return {
        formData,
        setFormData,
        isUploading,
        handleAvatarUpload,
        newLocation,
        setNewLocation,
        editingLocationIndex,
        handleAddOrUpdateLocation,
        handleEditLocation,
        handleRemoveLocation,
        cancelEditLocation,
        newSpouseId,
        setNewSpouseId,
        newMarriageDate,
        setNewMarriageDate,
        handleAddMarriage,
        handleRemoveMarriage,
        potentialSpouses,
    };
};

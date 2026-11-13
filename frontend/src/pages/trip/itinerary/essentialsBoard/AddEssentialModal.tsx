import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Text, displayAlert } from '../../../../components/common';
import { postToApi, getApiErrorMessage } from '../../../../utils/api';

interface AddEssentialModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddEssentialModal = ({ tripId, isOpen, onClose }: AddEssentialModalProps) => {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('title', title);
      if (value) formData.append('value', value);
      if (file) formData.append('file', file);

      // Using your new nested route
      return postToApi(`/trip/${tripId}/essentials`, formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] }); 
      void queryClient.invalidateQueries({ queryKey: ['trip-settings', tripId] });
      
      displayAlert({ message: 'Essential added.', tone: 'success' });
      handleClose();
    },
    onError: (error) => {
      displayAlert({ message: getApiErrorMessage(error, 'Could not add essential.'), tone: 'error' });
    }
  });

  const handleClose = () => {
    setTitle('');
    setValue('');
    setFile(null);
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      title="Add Trip Essential"
      onClose={handleClose}
      dismissDisabled={addMutation.isPending}
      footer={(requestClose) => (
        <>
          <Button variant="secondary" onClick={requestClose} disabled={addMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={() => addMutation.mutate()} 
            disabled={!title || addMutation.isPending}
          >
            {addMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </>
      )}
    >
      <div className="grid gap-4">
        <label className="grid gap-2">
          <Text as="span" variant="label">Title (e.g., Hotel Confirmation)</Text>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3"
            placeholder="Required"
          />
        </label>
        
        <label className="grid gap-2">
          <Text as="span" variant="label">Text Value (Optional)</Text>
          <input 
            type="text" 
            value={value} 
            onChange={(e) => setValue(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3"
            placeholder="e.g., #XYZ123"
          />
        </label>

        <label className="grid gap-2">
          <Text as="span" variant="label">Attach File (Optional)</Text>
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
          />
        </label>
      </div>
    </Modal>
  );
};
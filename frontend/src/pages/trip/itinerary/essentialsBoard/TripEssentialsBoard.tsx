import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, IconButton, Text, displayAlert } from '../../../../components/common';
import { deleteFromApi, getBlobFromApi, getApiErrorMessage } from '../../../../utils/api';
import { AddEssentialModal } from './AddEssentialModal';
import type { TripEssential } from '../../../../queries/trips';
import { Trash2, Pencil, Paperclip } from 'lucide-react';

interface TripEssentialsBoardProps {
  tripId: string;
  essentials?: TripEssential[];
  canEdit: boolean;
}

export const TripEssentialsBoard = ({ tripId, essentials = [], canEdit }: TripEssentialsBoardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (essentialId: string) => deleteFromApi(`/trip/${tripId}/essentials/${essentialId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip-settings', tripId] });
      displayAlert({ message: 'Essential removed.', tone: 'success' });
    },
    onError: (error) => {
      displayAlert({ message: getApiErrorMessage(error, 'Could not remove essential.'), tone: 'error' });
    }
  });

  const handleDownload = async (item: TripEssential) => {
    if (isDownloading === item._id) return;
    setIsDownloading(item._id);
    
    try {
      const blob = await getBlobFromApi(`/trip/${tripId}/essentials/${item._id}/download`);
      const url = window.URL.createObjectURL(blob);
      
      const ext = item.fileName?.split('.').pop() || 'pdf';
      const safeTitle = item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      displayAlert({ message: 'Failed to download file securely.', tone: 'error' });
    } finally {
      setIsDownloading(null);
    }
  };

  if (!essentials.length && !canEdit) return null;

  return (
    <section className="mb-8 rounded-panel border border-outline-variant bg-surface-container-low p-5">
      <div className="mb-4 flex items-center justify-between">
        <Text as="h3" variant="title">Trip Essentials</Text>
        {canEdit && (
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            + Add Essential
          </Button>
        )}
      </div>

      {essentials.length === 0 ? (
        <Text color="muted" className="italic">No essentials added yet.</Text>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {essentials.map((item) => (
            <li key={item._id} className="group relative flex flex-col justify-between rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
              <div className="pr-16">
                <Text variant="label" className="font-bold text-lg">{item.title}</Text>
                {item.value && <Text className="mt-1 text-gray-600">{item.value}</Text>}
                
                {item.fileUrl && (
                  <button 
                    onClick={() => void handleDownload(item)}
                    disabled={isDownloading === item._id}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    <Paperclip size={16} /> 
                    <span className="underline decoration-primary/50 underline-offset-2">
                      {isDownloading === item._id ? 'Downloading...' : (item.fileName || 'View Attachment')}
                    </span>
                  </button>
                )}
              </div>
              
              {canEdit && (
                <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-full bg-surface-container-low/90 p-1 opacity-0 pointer-events-none shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
                  <IconButton
                    label="Edit essential"
                    size="sm"
                    icon={<Pencil aria-hidden size={18} />}
                    onClick={() => displayAlert({ message: 'Edit modal coming next!', tone: 'info' })}
                  />
                  <IconButton
                    label="Delete essential"
                    size="sm"
                    variant="dangerGhost"
                    icon={<Trash2 aria-hidden size={18} />}
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(item._id)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <AddEssentialModal 
        tripId={tripId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </section>
  );
};
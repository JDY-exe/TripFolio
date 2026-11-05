import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, X } from 'lucide-react';
import { Button, IconButton, Text, TextArea } from '../../../components/common';
import {
  itineraryQueryKey,
  type Itinerary,
} from '../../../queries/itineraries';
import { getFromApi } from '../../../utils/api';
import { createCheckedPatch, saveChecked } from '../../../utils/checkedSave';
import { useEditorSnapshot } from '../../../queries/useEditorSnapshot';

interface ItineraryDescriptionProps {
  itinerary: Itinerary;
  tripId: string;
  readOnly?: boolean;
}

/** Displays and edits an itinerary's description in the trip sidebar.
 * @param props - The itinerary to display and its trip identifier.
 * @returns The description card and its editing controls.
 */
const ItineraryDescription = ({
  itinerary,
  tripId,
  readOnly = false,
}: ItineraryDescriptionProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [openedRecord, setOpenedRecord] = useState(itinerary);
  const snapshot = useEditorSnapshot(
    openedRecord,
    () => getFromApi<Itinerary>(`/itinerary?id=${tripId}`),
    (fresh) => setDraft(fresh.description),
    isEditing,
  );

  /** Opens the editor with the current description. */
  const handleEdit = () => {
    setDraft(itinerary.description);
    setOpenedRecord(itinerary);
    setIsEditing(true);
  };

  /** Saves the description and updates the cached itinerary.
   * @returns A promise that settles after the update request.
   */
  const handleSave = async () => {
    snapshot.startSaving();
    setIsSaving(true);
    try {
      const updated = await saveChecked<Itinerary>(
        `/itinerary/${itinerary._id}`,
        createCheckedPatch(snapshot.original ?? openedRecord, {
          description: draft,
        }),
        {},
        (current, changes) =>
          snapshot.rebase(current as unknown as Itinerary, changes),
      );
      queryClient.setQueryData(itineraryQueryKey(tripId), updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update itinerary description:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-panel bg-surface-container-low p-8 text-on-surface">
      <div className="flex items-center justify-between gap-2">
        <Text as="h3" variant="title">
          Description
        </Text>
        {!readOnly && !isEditing && (
          <IconButton
            data-cy="description-edit"
            label="Edit description"
            icon={<Pencil size={16} />}
            size="sm"
            onClick={handleEdit}
          />
        )}
      </div>
      {isEditing && (
        <div className="mt-3 flex flex-col gap-3">
          <TextArea
            data-cy="description-input"
            aria-label="Description"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a description"
            rows={4}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              data-cy="description-save"
              disabled={isSaving}
              onClick={() => void handleSave()}
              size="sm"
              leadingIcon={<Check size={16} />}
            >
              Save
            </Button>
            <Button
              data-cy="description-cancel"
              disabled={isSaving}
              onClick={() => setIsEditing(false)}
              variant="ghost"
              size="sm"
              leadingIcon={<X size={16} />}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {!isEditing && (
        <Text
          color="muted"
          className={`mt-3 whitespace-pre-wrap ${itinerary.description ? '' : 'italic'}`}
        >
          {itinerary.description || 'No description provided.'}
        </Text>
      )}
    </section>
  );
};

export default ItineraryDescription;

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, X } from 'lucide-react';
import {
  Button,
  Text,
  TextArea,
  displayAlert,
} from '../../../components/common';
import {
  itineraryQueryKey,
  type Itinerary,
} from '../../../queries/itineraries';
import { getFromApi, getApiErrorMessage } from '../../../utils/api';
import { createCheckedPatch, saveChecked } from '../../../utils/checkedSave';
import { useEditorSnapshot } from '../../../queries/useEditorSnapshot';

interface ItineraryDescriptionProps {
  itinerary: Itinerary;
  tripId: string;
  readOnly?: boolean;
  embedded?: boolean;
}

/** Displays the itinerary description and provides editing from trip settings.
 * @param props - The itinerary to display and its trip identifier.
 * @returns The description card and its editing controls.
 */
const ItineraryDescription = ({
  itinerary,
  tripId,
  readOnly = false,
  embedded = false,
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
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Could not save the description. Please try again.',
        ),
        tone: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className={
        embedded
          ? 'text-on-surface'
          : 'rounded-panel bg-surface-container-low p-8 text-on-surface'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <Text
          as={embedded ? 'h4' : 'h3'}
          variant={embedded ? 'label' : 'title'}
        >
          Description
        </Text>
        {!readOnly && !isEditing && (
          <Button
            data-cy="description-edit"
            leadingIcon={<Pencil size={16} />}
            variant="ghost"
            size="sm"
            onClick={handleEdit}
          >
            Edit description
          </Button>
        )}
      </div>
      {isEditing && (
        <div className="mt-3 flex flex-col gap-3">
          <TextArea
            data-cy="description-input"
            aria-label="Description"
            disabled={isSaving}
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
              {isSaving ? 'Saving…' : 'Save description'}
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
          {itinerary.description ||
            (readOnly
              ? 'No description provided.'
              : 'Add a short introduction, travel goals, or notes for your group.')}
        </Text>
      )}
    </section>
  );
};

export default ItineraryDescription;

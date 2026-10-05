import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, X } from 'lucide-react';
import { Button, IconButton, Text, TextArea } from '../../../components/common';
import {
  itineraryQueryKey,
  type Itinerary,
} from '../../../queries/itineraries';
import { patchToApi } from '../../../utils/api';

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

  /** Opens the editor with the current description. */
  const handleEdit = () => {
    setDraft(itinerary.description);
    setIsEditing(true);
  };

  /** Saves the description and updates the cached itinerary.
   * @returns A promise that settles after the update request.
   */
  const handleSave = async () => {
    try {
      const updated = await patchToApi<Itinerary>(
        `/itinerary/${itinerary._id}`,
        { description: draft },
      );
      queryClient.setQueryData(itineraryQueryKey(tripId), updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update itinerary description:', error);
    }
  };

  return (
    <section className="rounded-panel bg-surface-container-low p-8 text-on-surface">
      <div className="flex items-center justify-between gap-2">
        <Text as="h3" variant="title">
          Description
        </Text>
        {!readOnly && !isEditing ? (
          <IconButton
            label="Edit description"
            icon={<Pencil size={16} />}
            size="sm"
            onClick={handleEdit}
          />
        ) : null}
      </div>
      {isEditing ? (
        <div className="mt-3 flex flex-col gap-3">
          <TextArea
            aria-label="Description"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a description"
            rows={4}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void handleSave()}
              size="sm"
              leadingIcon={<Check size={16} />}
            >
              Save
            </Button>
            <Button
              onClick={() => setIsEditing(false)}
              variant="ghost"
              size="sm"
              leadingIcon={<X size={16} />}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
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

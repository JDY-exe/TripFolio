import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { Button, IconButton, Text, TextArea } from '../../../components/common';

/**
 * Presents a private notes editor for the current archived itinerary.
 * The note remains in component state until persistence is connected.
 *
 * @returns The notes card with its edit and saved display states.
 */
const ArchivedItineraryNotes = () => {
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');
  const [isEditing, setIsEditing] = useState(true);

  /** Copies the saved note into the editor before editing. */
  const handleEdit = () => {
    setDraft(note);
    setIsEditing(true);
  };

  /** Saves a non-empty note in the current view and exits edit mode. */
  const handleSave = () => {
    const trimmedDraft = draft.trim();
    if (trimmedDraft.length === 0) return;

    setNote(trimmedDraft);
    setDraft(trimmedDraft);
    setIsEditing(false);
  };

  /** Discards edits and returns to the saved note when one exists. */
  const handleCancel = () => {
    setDraft(note);
    setIsEditing(false);
  };

  return (
    <section
      aria-labelledby="archived-itinerary-notes-heading"
      className="rounded-panel bg-surface-container-low p-8 text-on-surface"
      data-cy="archived-itinerary-notes"
    >
      <div className="flex items-center justify-between gap-2">
        <Text as="h3" id="archived-itinerary-notes-heading" variant="title">
          Personal notes
        </Text>
        {!isEditing && (
          <IconButton
            data-cy="archived-note-edit"
            label="Edit personal notes"
            icon={<Pencil size={16} />}
            size="sm"
            onClick={handleEdit}
          />
        )}
      </div>
      <Text color="muted" className="mt-2">
        Only you can see these notes.
      </Text>
      {isEditing && (
        <div className="mt-4 flex flex-col gap-3">
          <TextArea
            data-cy="archived-note-input"
            aria-label="Personal notes"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a note about this trip"
            rows={5}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              data-cy="archived-note-save"
              onClick={handleSave}
              size="sm"
              leadingIcon={<Check size={16} />}
              disabled={draft.trim().length === 0}
            >
              Save note
            </Button>
            {note.length > 0 && (
              <Button
                data-cy="archived-note-cancel"
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                leadingIcon={<X size={16} />}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
      {!isEditing && (
        <Text
          color="muted"
          className="mt-4 whitespace-pre-wrap"
          data-cy="archived-note-content"
        >
          {note}
        </Text>
      )}
    </section>
  );
};

export default ArchivedItineraryNotes;

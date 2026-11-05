import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import {
  Button,
  IconButton,
  LoadingIndicator,
  Text,
  TextArea,
  displayAlert,
} from '../../../components/common';
import {
  useArchivedItineraryNote,
  useSaveArchivedItineraryNote,
} from '../../../queries/itineraries';
import { getApiErrorMessage, getFromApi } from '../../../utils/api';
import type { ArchivedItineraryNote } from '../../../queries/itineraries';
import { useEditorSnapshot } from '../../../queries/useEditorSnapshot';

interface ArchivedItineraryNotesProps {
  tripId: string;
  userId: string;
}

/**
 * Presents a private notes editor for the current archived itinerary.
 *
 * @param props - Trip and user identifiers used to load and save the private note.
 * @returns The notes card with its edit and saved display states.
 */
const ArchivedItineraryNotes = ({
  tripId,
  userId,
}: ArchivedItineraryNotesProps) => {
  const { note, isPending, isError, refetch } = useArchivedItineraryNote(
    userId,
    tripId,
  );
  const saveNote = useSaveArchivedItineraryNote(userId, tripId);
  const savedContent = note?.content ?? '';
  const [draft, setDraft] = useState('');
  const [editingState, setEditingState] = useState<boolean | null>(null);
  const isEditing = editingState ?? (note === null || note === undefined);
  const snapshot = useEditorSnapshot(
    note ?? undefined,
    async () =>
      (await getFromApi<ArchivedItineraryNote | null>(
        `/itinerary/${tripId}/notes`,
      ))!,
    (fresh) => setDraft(fresh.content),
    isEditing && Boolean(note),
  );

  /** Copies the saved note into the editor before editing. */
  const handleEdit = () => {
    setDraft(savedContent);
    setEditingState(true);
  };

  /** Persists the note and returns to its saved display state.
   * @returns A promise that settles after the create or update request.
   */
  const handleSave = async () => {
    if (!note && draft.trim().length === 0) return;

    snapshot.startSaving();
    try {
      const savedNote = await saveNote.mutateAsync({
        content: draft,
        noteId: note?._id,
        original: snapshot.original ?? note ?? undefined,
        onRebase: snapshot.rebase,
      });
      setDraft(savedNote.content);
      setEditingState(false);
      displayAlert('Note saved.');
    } catch (error) {
      displayAlert({
        message: getApiErrorMessage(error, 'Could not save your note.'),
        tone: 'error',
      });
    }
  };

  /** Discards edits and returns to the saved note when one exists. */
  const handleCancel = () => {
    setDraft(savedContent);
    setEditingState(false);
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
      {isPending && (
        <div className="mt-4 flex items-center gap-3" role="status">
          <LoadingIndicator size={28} label="Loading personal notes" />
          <Text color="muted">Loading notes...</Text>
        </div>
      )}
      {!isPending && isError && (
        <div className="mt-4 flex flex-col items-start gap-3" role="alert">
          <Text color="error">Could not load your notes.</Text>
          <Button
            data-cy="archived-note-retry"
            onClick={() => void refetch()}
            size="sm"
            variant="secondary"
          >
            Retry
          </Button>
        </div>
      )}
      {!isPending && !isError && (
        <>
          {isEditing && (
            <div className="mt-4 flex flex-col gap-3">
              <TextArea
                data-cy="archived-note-input"
                aria-label="Personal notes"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a note about this trip"
                rows={5}
                disabled={saveNote.isPending}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  data-cy="archived-note-save"
                  onClick={() => void handleSave()}
                  size="sm"
                  leadingIcon={<Check size={16} />}
                  disabled={
                    saveNote.isPending || (!note && draft.trim().length === 0)
                  }
                >
                  {saveNote.isPending ? 'Saving...' : 'Save note'}
                </Button>
                {note && (
                  <Button
                    data-cy="archived-note-cancel"
                    onClick={handleCancel}
                    variant="ghost"
                    size="sm"
                    leadingIcon={<X size={16} />}
                    disabled={saveNote.isPending}
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
              {savedContent || 'No note saved.'}
            </Text>
          )}
        </>
      )}
    </section>
  );
};

export default ArchivedItineraryNotes;

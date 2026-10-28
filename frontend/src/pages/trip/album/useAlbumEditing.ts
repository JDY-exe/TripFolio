import { useState } from 'react';
import { displayAlert } from '../../../components/common';
import { useDeletePhotos, type TripPhoto } from '../../../queries/photos';

/** Owns edit-mode selection and confirmed batch deletion without storing server data locally.
 * @param tripId - Destination for authenticated delete requests.
 * @param photos - Loaded photos, used to exclude stale selections.
 * @returns Edit controls, current selection, confirmation state, and deletion status.
 */
export const useAlbumEditing = (tripId: string, photos: TripPhoto[]) => {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deletion = useDeletePhotos(tripId);
  const selectedIds = selected.filter((id) =>
    photos.some((photo) => photo.id === id),
  );

  /** Toggles a photo without opening the viewer; pending deletions lock selection. */
  const toggle = (id: string) => {
    if (deletion.isPending) return;
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  /** Leaves edit mode and discards selection without changing any photos. */
  const finish = () => {
    if (deletion.isPending) return;
    setEditing(false);
    setSelected([]);
    setConfirmOpen(false);
  };

  /** Deletes a snapshot of confirmed IDs, retaining only failures for retry.
   * @returns A promise resolving once requests and shared-cache updates complete.
   */
  const confirmDelete = async () => {
    if (deletion.isPending || selectedIds.length === 0) return;
    const { deletedIds, failures } = await deletion.mutateAsync(selectedIds);
    setSelected(failures.map((failure) => failure.id));
    setConfirmOpen(false);
    if (deletedIds.length > 0)
      displayAlert({
        message: `${deletedIds.length} ${deletedIds.length === 1 ? 'photo' : 'photos'} deleted.`,
        tone: 'success',
      });
    if (failures.length > 0)
      displayAlert({
        title: `${failures.length} ${failures.length === 1 ? 'photo couldn’t' : 'photos couldn’t'} be deleted`,
        message: `${failures[0].message} Failed photos remain selected.`,
        tone: 'error',
      });
  };

  return {
    editing,
    selectedIds,
    confirmOpen,
    setConfirmOpen,
    deleting: deletion.isPending,
    toggle,
    finish,
    confirmDelete,
    start: () => {
      setEditing(true);
      setSelected([]);
    },
  };
};

import { Button, Modal, Text } from '../../../components/common';

interface AlbumDeleteModalProps {
  selectedCount: number;
  deleting: boolean;
  confirmOpen: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

/** Confirms permanent deletion without adding controls to the album workspace.
 * @param props - Selection count, deletion state, and confirmation callbacks.
 * @returns A shared destructive-action modal, locked while deletion is pending.
 */
const AlbumDeleteModal = ({
  selectedCount,
  deleting,
  confirmOpen,
  onCancelDelete,
  onConfirmDelete,
}: AlbumDeleteModalProps) => (
  <Modal
    open={confirmOpen}
    title={`Delete ${selectedCount} ${selectedCount === 1 ? 'photo' : 'photos'}?`}
    onClose={onCancelDelete}
    dismissDisabled={deleting}
    data-cy="album-delete-dialog"
    footer={
      <>
        <Button variant="outline" onClick={onCancelDelete} disabled={deleting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirmDelete}
          disabled={deleting || selectedCount === 0}
          data-cy="album-confirm-delete"
        >
          {deleting ? 'Deleting…' : 'Delete photos'}
        </Button>
      </>
    }
  >
    <Text>
      These photos will be permanently deleted from this trip’s album for
      everyone. This can’t be undone.
    </Text>
  </Modal>
);

export default AlbumDeleteModal;

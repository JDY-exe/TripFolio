import { ImagePlus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Button, Skeleton, Text } from '../../../components/common';
import { usePhotos } from '../../../queries/photos';
import AlbumMobileTabs, { type AlbumTab } from './AlbumMobileTabs';
import AlbumUploadModal from './AlbumUploadModal';
import AlbumMap from './AlbumMap';
import PhotoGrid from './PhotoGrid';
import PhotoViewer from './PhotoViewer';
import AlbumDeleteModal from './AlbumDeleteModal';
import { useAlbumEditing } from './useAlbumEditing';

/**
 * Composes album browsing, batch-edit controls, uploads, and the fixed map workspace.
 * @returns A date-grouped gallery with mobile tabs and focused upload/photo dialogs.
 */
const AlbumView = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<AlbumTab>('photos');
  const [selectedId, setSelectedId] = useState<string>();
  const album = usePhotos(id);
  const photos = album.data?.pages.flatMap((page) => page.photos) ?? [];
  const edit = useAlbumEditing(id, photos);

  return (
    <section
      aria-labelledby="album-heading"
      className="-mx-2 flex h-[calc(100dvh-11.5rem)] min-h-0 min-w-0 flex-col text-on-surface sm:mx-0 lg:col-span-2"
    >
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div>
          <Text as="h2" id="album-heading" variant="display">
            Album
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            leadingIcon={!edit.editing && <Pencil size={18} />}
            disabled={edit.deleting || (!edit.editing && photos.length === 0)}
            aria-pressed={edit.editing}
            onClick={() => {
              if (edit.editing) edit.finish();
              else {
                edit.start();
                setMobileTab('photos');
              }
            }}
            data-cy="album-edit-photos"
          >
            {edit.editing ? 'Cancel' : 'Edit mode'}
          </Button>
          <Button
            variant={edit.editing ? 'danger' : 'primary'}
            leadingIcon={
              <>
                {!edit.editing && <ImagePlus size={18} />}
                {edit.editing && <Trash2 size={18} />}
              </>
            }
            onClick={() => {
              if (edit.editing) edit.setConfirmOpen(true);
              else setUploadOpen(true);
            }}
            disabled={
              edit.deleting || (edit.editing && edit.selectedIds.length === 0)
            }
            data-cy={
              edit.editing ? 'album-delete-selected' : 'album-add-photos'
            }
          >
            {edit.editing
              ? edit.deleting
                ? 'Deleting…'
                : `Delete ${edit.selectedIds.length}`
              : 'Add photos'}
          </Button>
        </div>
      </div>
      <AlbumMobileTabs
        value={mobileTab}
        onChange={(tab) => {
          if (!edit.deleting) {
            setMobileTab(tab);
            if (tab === 'map') edit.finish();
          }
        }}
      />
      {edit.editing && (
        <AlbumDeleteModal
          selectedCount={edit.selectedIds.length}
          deleting={edit.deleting}
          confirmOpen={edit.confirmOpen}
          onCancelDelete={() => edit.setConfirmOpen(false)}
          onConfirmDelete={() => {
            void edit.confirmDelete();
          }}
        />
      )}
      <div className="grid min-h-0 min-w-0 flex-1 gap-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-6">
        <div
          id="album-photos-panel"
          role="region"
          aria-label="Album photos"
          tabIndex={0}
          data-cy="album-photos-panel"
          className={`min-h-0 min-w-0 overflow-y-auto overscroll-contain p-1 pb-4 focus-visible:outline-2 focus-visible:outline-primary lg:pr-4 ${mobileTab === 'photos' ? 'block' : 'hidden lg:block'}`}
        >
          {album.isPending && (
            <div
              role="status"
              aria-label="Loading album"
              className="grid grid-cols-3 gap-1"
            >
              {Array.from({ length: 9 }, (_, index) => (
                <Skeleton key={index} className="aspect-square rounded-none" />
              ))}
            </div>
          )}
          {album.isError && !album.data && (
            <div role="alert" className="py-12">
              <Text variant="title">Your album couldn’t load</Text>
              <Text color="muted" className="mt-2 mb-4">
                Try again to see your trip photos.
              </Text>
              <Button
                variant="outline"
                onClick={() => {
                  void album.refetch();
                }}
              >
                Retry album
              </Button>
            </div>
          )}
          {!album.isPending && !album.isError && photos.length === 0 && (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-panel bg-surface-container-low px-6 text-center">
              <Text color="muted" className="mt-3 max-w-sm">
                No photos yet
              </Text>
            </div>
          )}
          {!album.isPending && photos.length > 0 && (
            <PhotoGrid
              photos={photos}
              onOpen={setSelectedId}
              editing={edit.editing}
              selectedIds={edit.selectedIds}
              disabled={edit.deleting}
              onToggle={edit.toggle}
            />
          )}
          {album.isFetchNextPageError && (
            <Text role="alert" color="error" variant="caption" className="mt-4">
              More photos couldn’t load. Try loading them again.
            </Text>
          )}
          {album.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                disabled={album.isFetchingNextPage}
                onClick={() => {
                  void album.fetchNextPage();
                }}
              >
                {album.isFetchingNextPage
                  ? 'Loading photos…'
                  : 'Load more photos'}
              </Button>
            </div>
          )}
        </div>
        <div
          id="album-map-panel"
          className={`min-h-0 min-w-0 ${mobileTab === 'map' ? 'block' : 'hidden lg:block'}`}
        >
          <AlbumMap tripId={id} />
        </div>
      </div>
      <AlbumUploadModal
        tripId={id}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
      {selectedId && (
        <PhotoViewer
          photos={photos}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onClose={() => setSelectedId(undefined)}
        />
      )}
    </section>
  );
};

export default AlbumView;

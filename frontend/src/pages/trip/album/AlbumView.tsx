import { ImagePlus, Images, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Button, Skeleton, Text } from '../../../components/common';
import { usePhotos } from '../../../queries/photos';
import AlbumMobileTabs, { type AlbumTab } from './AlbumMobileTabs';
import AlbumUploadModal from './AlbumUploadModal';
import AlbumMap from './AlbumMap';
import AlbumEmptyState from './AlbumEmptyState';
import PhotoGrid from './PhotoGrid';
import PhotoViewer from './PhotoViewer';
import AlbumDeleteModal from './AlbumDeleteModal';
import { useAlbumEditing } from './useAlbumEditing';
import { hasPhotoLocation, type AlbumFilter } from './atlas/atlasGrouping';
import { groupPhotosByTakenDate } from './photoDates';
import HighlightsModal from './collage/HighlightsModal';

/**
 * Composes album browsing, batch-edit controls, uploads, and the fixed map workspace.
 * @param props - Whether to allow browsing only, without upload or deletion.
 * @returns A date-grouped gallery with mobile tabs and focused upload/photo dialogs.
 */
const AlbumView = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { id = '' } = useParams<{ id: string }>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [recapTripId, setRecapTripId] = useState<string>();
  const [mobileTab, setMobileTab] = useState<AlbumTab>('photos');
  const [selectedId, setSelectedId] = useState<string>();
  const [filter, setFilter] = useState<AlbumFilter & { tripId: string }>();
  const gallery = useRef<HTMLDivElement>(null);
  const filterHeading = useRef<HTMLDivElement>(null);
  const [desktop, setDesktop] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  );
  const album = usePhotos(id);
  const photos = useMemo(
    () => album.data?.pages.flatMap((page) => page.photos) ?? [],
    [album.data],
  );
  const edit = useAlbumEditing(id, photos);
  const filteredPhotos = useMemo(
    () =>
      photos.filter((photo) =>
        filter?.unplaced
          ? !hasPhotoLocation(photo)
          : filter?.photoIds.includes(photo.id),
      ),
    [photos, filter],
  );
  const activeFilter =
    filter?.tripId === id && filteredPhotos.length > 0 ? filter : undefined;
  const visiblePhotos = useMemo(
    () =>
      groupPhotosByTakenDate(activeFilter ? filteredPhotos : photos).flatMap(
        (group) => group.photos,
      ),
    [activeFilter, filteredPhotos, photos],
  );
  const atlasActive = desktop || mobileTab === 'map' || Boolean(activeFilter);
  const { hasNextPage, isFetchingNextPage, isError, fetchNextPage } = album;

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    /** Keeps metadata pagination aligned with the visible atlas pane. */
    const update = () => setDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (atlasActive && hasNextPage && !isFetchingNextPage && !isError) {
      void fetchNextPage();
    }
  }, [atlasActive, hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  return (
    <>
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
            {!edit.editing && (
              <Button
                variant="outline"
                leadingIcon={<Images size={18} />}
                onClick={() => setRecapTripId(id)}
                data-cy="album-share-highlights"
              >
                Share highlights
              </Button>
            )}
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  leadingIcon={!edit.editing && <Pencil size={18} />}
                  disabled={
                    edit.deleting || (!edit.editing && photos.length === 0)
                  }
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
                    edit.deleting ||
                    (edit.editing && edit.selectedIds.length === 0)
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
            )}
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
        {!readOnly && edit.editing && (
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
        <div className="grid min-h-0 min-w-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
          <div
            id="album-photos-panel"
            ref={gallery}
            role="region"
            aria-label="Album photos"
            tabIndex={0}
            data-cy="album-photos-panel"
            className={`min-h-0 min-w-0 overflow-y-auto overscroll-contain p-1 pb-4 focus-visible:outline-2 focus-visible:outline-primary lg:pr-4 ${mobileTab === 'photos' ? 'block' : 'hidden lg:block'}`}
          >
            {activeFilter && (
              <div
                ref={filterHeading}
                tabIndex={-1}
                className="sticky top-0 z-20 mb-4 flex items-start justify-between gap-3 bg-surface pb-3 focus:outline-none"
                data-cy="album-filter"
              >
                <Text as="h3" variant="title">
                  {activeFilter.label}
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={edit.deleting}
                  data-cy="album-clear-filter"
                  onClick={() => {
                    setFilter(undefined);
                    edit.finish();
                    requestAnimationFrame(() =>
                      gallery.current?.focus({ preventScroll: true }),
                    );
                  }}
                >
                  Clear filter
                </Button>
              </div>
            )}
            {album.isPending && (
              <div
                role="status"
                aria-label="Loading album"
                className="grid grid-cols-3 gap-1"
              >
                {Array.from({ length: 9 }, (_, index) => (
                  <Skeleton
                    key={index}
                    className="aspect-square rounded-none"
                  />
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
              <AlbumEmptyState />
            )}
            {!album.isPending && photos.length > 0 && (
              <PhotoGrid
                photos={visiblePhotos}
                onOpen={setSelectedId}
                editing={!readOnly && edit.editing}
                selectedIds={edit.selectedIds}
                disabled={edit.deleting}
                onToggle={edit.toggle}
              />
            )}
            {album.isFetchNextPageError && (
              <Text
                role="alert"
                color="error"
                variant="caption"
                className="mt-4"
              >
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
            <AlbumMap
              key={id}
              tripId={id}
              photos={photos}
              loadingMore={Boolean(album.hasNextPage && !album.isError)}
              hasError={album.isError}
              onRetry={() => {
                void album.refetch();
              }}
              filter={activeFilter}
              disabled={edit.deleting}
              onFilter={(next) => {
                if (edit.deleting) return;
                edit.finish();
                setFilter({ ...next, tripId: id });
                setMobileTab('photos');
                requestAnimationFrame(() => {
                  gallery.current?.scrollTo({ top: 0 });
                  filterHeading.current?.focus({ preventScroll: true });
                });
              }}
            />
          </div>
        </div>
        {!readOnly && (
          <AlbumUploadModal
            tripId={id}
            open={uploadOpen}
            onClose={() => setUploadOpen(false)}
          />
        )}
        {selectedId && (
          <PhotoViewer
            photos={visiblePhotos}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(undefined)}
          />
        )}
      </section>
      <HighlightsModal
        tripId={id}
        open={recapTripId === id}
        onClose={() => setRecapTripId(undefined)}
      />
    </>
  );
};

export default AlbumView;

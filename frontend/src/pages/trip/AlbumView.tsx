import { ImagePlus, Upload } from 'lucide-react';
import { Text } from '../../components/common';

/**
 * Presents a static photo-upload surface for the trip album.
 * Layered image shapes frame a native file input, disabled until uploads are wired.
 *
 * @returns A presentation-only album with no file processing or network requests.
 */
function AlbumView() {
  return (
    <section
      aria-labelledby="album-heading"
      className="min-w-0 text-on-surface lg:col-span-2"
    >
      <Text as="h2" id="album-heading" variant="title">
        Album
      </Text>

      <div className="mt-6 flex min-h-80 flex-col items-center justify-center gap-8 rounded-[2rem_0.75rem_2rem_0.75rem] border border-dashed border-outline-variant bg-surface-container-low px-6 py-12 sm:min-h-96">
        <div
          aria-hidden="true"
          className="relative grid size-28 place-items-center"
        >
          <div className="absolute inset-2 -rotate-12 rounded-[1.5rem_0.5rem_1.5rem_0.5rem] bg-secondary-container" />
          <div className="relative grid size-24 rotate-6 place-items-center rounded-[2rem_0.75rem_2rem_0.75rem] bg-primary-container text-on-primary-container">
            <ImagePlus size={36} strokeWidth={1.5} className="-rotate-6" />
          </div>
        </div>

        {/* TODO: Enable photo selection and upload when implementing the album. */}
        <label className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 py-3 text-label text-on-primary">
          <Upload aria-hidden size={18} />
          Choose photos
          <input
            type="file"
            name="photos"
            accept="image/*"
            multiple
            disabled
            className="sr-only"
          />
        </label>
      </div>
    </section>
  );
}

export default AlbumView;

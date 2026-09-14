import { MediaUpload, Text } from '../../components/common';

/**
 * Presents the trip album's shared photo-selection surface. The common uploader
 * owns native file filtering and temporary filename notifications.
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

      <MediaUpload
        className="mt-6 min-h-80 sm:min-h-96"
        height="auto"
        mediaType="image"
        multiple
        name="photos"
      />
    </section>
  );
}

export default AlbumView;

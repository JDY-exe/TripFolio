export const mediaUploadAcceptTypes = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  any: undefined,
} as const;

export type MediaUploadMediaType = keyof typeof mediaUploadAcceptTypes;

/**
 * Normalizes a single media category and a readonly category list into the same
 * array shape so subsequent helpers preserve their strict key types.
 *
 * @param mediaType - One or more accepted media categories.
 * @returns The categories represented as a readonly array.
 */
function normalizeMediaTypes(
  mediaType: MediaUploadMediaType | readonly MediaUploadMediaType[],
): readonly MediaUploadMediaType[] {
  return typeof mediaType === 'string' ? [mediaType] : mediaType;
}

/**
 * Converts semantic media types into a native file-input accept string. It
 * removes duplicate MIME patterns and leaves the input unrestricted for `any`.
 *
 * @param mediaType - One or more categories allowed by the upload control.
 * @returns A comma-separated accept value, or undefined for unrestricted files.
 */
export function getMediaUploadAccept(
  mediaType: MediaUploadMediaType | readonly MediaUploadMediaType[],
) {
  const types = normalizeMediaTypes(mediaType);
  if (types.length === 0 || types.includes('any')) return undefined;

  return [...new Set(types.map((type) => mediaUploadAcceptTypes[type]))].join(
    ',',
  );
}

/**
 * Creates a concise default action label from the accepted media and selection
 * mode. Mixed categories use the broad “media” term to avoid a long label.
 *
 * @param mediaType - One or more accepted media categories.
 * @param multiple - Whether more than one file may be selected.
 * @returns Human-readable text for the file-picker action.
 */
export function getMediaUploadLabel(
  mediaType: MediaUploadMediaType | readonly MediaUploadMediaType[],
  multiple: boolean,
) {
  const types = normalizeMediaTypes(mediaType);
  const subject =
    types.length !== 1
      ? 'media'
      : {
          image: multiple ? 'photos' : 'photo',
          video: multiple ? 'videos' : 'video',
          audio: 'audio',
          any: multiple ? 'files' : 'file',
        }[types[0]];

  return `Choose ${subject}`;
}

/**
 * Creates concise drop-zone guidance from the accepted media and selection
 * mode, using the same terminology as the native picker label.
 *
 * @param mediaType - One or more categories allowed by the upload control.
 * @param multiple - Whether more than one file may be dropped.
 * @returns Human-readable guidance for the drag-and-drop surface.
 */
export function getMediaUploadDropLabel(
  mediaType: MediaUploadMediaType | readonly MediaUploadMediaType[],
  multiple: boolean,
) {
  return getMediaUploadLabel(mediaType, multiple).replace('Choose', 'Drop');
}

/**
 * Checks whether a dropped file matches at least one configured media category.
 * Empty browser MIME values are accepted because some operating systems do not
 * provide a type for otherwise valid files.
 *
 * @param file - File-like value whose browser-provided MIME type is inspected.
 * @param mediaType - One or more categories allowed by the upload control.
 * @returns Whether the file is eligible for selection.
 */
export function isMediaUploadFileAccepted(
  file: Pick<File, 'type'>,
  mediaType: MediaUploadMediaType | readonly MediaUploadMediaType[],
) {
  const types = normalizeMediaTypes(mediaType);
  if (types.length === 0 || types.includes('any') || !file.type) return true;

  return types.some((type) => file.type.startsWith(`${type}/`));
}

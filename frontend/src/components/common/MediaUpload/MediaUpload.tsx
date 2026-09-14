import { FileUp, Film, ImagePlus, Music, Upload } from 'lucide-react';
import { useRef, type CSSProperties, type HTMLAttributes } from 'react';
import Button from '../Button';
import CircularProgressIndicator from '../CircularProgressIndicator';
import LoadingIndicator from '../LoadingIndicator';
import {
  getMediaUploadAccept,
  getMediaUploadLabel,
  type MediaUploadMediaType,
} from './mediaUploadConfig';
import { announceMediaUploadFiles } from './mediaUploadSelection';

export type MediaUploadLoadingIndicatorType = 'expressive' | 'circular';

export interface MediaUploadProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** Width of the complete upload surface. Numbers are interpreted as pixels. */
  width?: CSSProperties['width'];
  /** Height of the complete upload surface. Numbers are interpreted as pixels. */
  height?: CSSProperties['height'];
  /** Whether the native picker may select more than one file. */
  multiple?: boolean;
  /** Semantic file categories accepted by the native picker. */
  mediaType?: MediaUploadMediaType | readonly MediaUploadMediaType[];
  /** Whether to replace the picker with an indeterminate loading state. */
  loading?: boolean;
  /** Shared loading component displayed while `loading` is true. */
  loadingIndicatorType?: MediaUploadLoadingIndicatorType;
  /** Visible and accessible label for the picker action. */
  label?: string;
  /** Accessible description for the loading state. */
  loadingLabel?: string;
  /** Native form name assigned to the hidden file input. */
  name?: string;
  /** Whether file selection is unavailable. */
  disabled?: boolean;
  /** Receives selected filenames after their alerts are queued. */
  onFilesSelected?: (fileNames: readonly string[]) => void;
}

/**
 * Renders the decorative icon representing the accepted media category. A
 * switch keeps each icon component statically defined for React compilation.
 *
 * @param props - Media categories accepted by the picker.
 * @returns A media-specific Lucide icon, or a generic file icon for mixed types.
 */
function MediaArtworkIcon({ mediaType }: Pick<MediaUploadProps, 'mediaType'>) {
  const resolvedType =
    typeof mediaType === 'string'
      ? mediaType
      : mediaType?.length === 1
        ? mediaType[0]
        : 'any';
  const iconProps = {
    className: '-rotate-6',
    size: 36,
    strokeWidth: 1.5,
  };

  if (resolvedType === 'image') return <ImagePlus {...iconProps} />;
  if (resolvedType === 'video') return <Film {...iconProps} />;
  if (resolvedType === 'audio') return <Music {...iconProps} />;
  return <FileUp {...iconProps} />;
}

/**
 * Renders a generic media picker with M3-inspired expressive artwork. Selection
 * opens the native file dialog, announces every filename, and then clears the
 * input so no selected file contents remain attached to the component.
 *
 * @param props - Dimensions, accepted media, loading state, and container props.
 * @returns A reusable upload surface backed by a hidden native file input.
 */
function MediaUpload({
  width = '100%',
  height = 384,
  multiple = false,
  mediaType = 'any',
  loading = false,
  loadingIndicatorType = 'expressive',
  label,
  loadingLabel = 'Uploading media',
  name = 'media',
  disabled = false,
  onFilesSelected,
  className,
  style,
  ...containerProps
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerLabel = label ?? getMediaUploadLabel(mediaType, multiple);
  const mergedStyle: CSSProperties = {
    boxSizing: 'border-box',
    width,
    height,
    ...style,
  };

  /**
   * Opens the platform file picker through the hidden native input.
   *
   * @returns Nothing; the browser owns the resulting selection dialog.
   */
  const openFilePicker = () => inputRef.current?.click();

  /**
   * Announces selected filenames and immediately resets the native input. This
   * temporary behavior intentionally reads no file content and retains no files.
   *
   * @returns Nothing; alerts are sent through the shared toast store.
   */
  const handleFileSelection = () => {
    const input = inputRef.current;
    if (!input?.files) return;

    const fileNames = Array.from(input.files, (file) => file.name);
    announceMediaUploadFiles(input.files);
    onFilesSelected?.(fileNames);
    input.value = '';
  };

  return (
    <div
      {...containerProps}
      aria-busy={loading || undefined}
      className={[
        'flex flex-col items-center justify-center gap-8 rounded-[2rem_0.75rem_2rem_0.75rem] border border-dashed border-outline-variant bg-surface-container-low px-6 py-12',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={mergedStyle}
    >
      {loading ? (
        loadingIndicatorType === 'circular' ? (
          <CircularProgressIndicator indeterminate label={loadingLabel} />
        ) : (
          <LoadingIndicator label={loadingLabel} />
        )
      ) : (
        <>
          <div
            aria-hidden="true"
            className="relative grid size-28 place-items-center"
          >
            <div className="absolute inset-2 -rotate-12 rounded-[1.5rem_0.5rem_1.5rem_0.5rem] bg-secondary-container" />
            <div className="relative grid size-24 rotate-6 place-items-center rounded-[2rem_0.75rem_2rem_0.75rem] bg-primary-container text-on-primary-container">
              <MediaArtworkIcon mediaType={mediaType} />
            </div>
          </div>

          <Button
            disabled={disabled}
            leadingIcon={<Upload aria-hidden size={18} />}
            onClick={openFilePicker}
          >
            {pickerLabel}
          </Button>
          <input
            ref={inputRef}
            accept={getMediaUploadAccept(mediaType)}
            disabled={disabled}
            hidden
            multiple={multiple}
            name={name}
            onChange={handleFileSelection}
            type="file"
          />
        </>
      )}
    </div>
  );
}

export default MediaUpload;

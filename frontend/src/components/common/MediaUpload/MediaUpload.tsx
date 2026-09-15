import { FileUp, Film, ImagePlus, Music, Upload } from 'lucide-react';
import {
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type HTMLAttributes,
} from 'react';
import Button from '../Button';
import CircularProgressIndicator from '../CircularProgressIndicator';
import LoadingIndicator from '../LoadingIndicator';
import Text from '../Text';
import {
  getMediaUploadAccept,
  getMediaUploadDropLabel,
  getMediaUploadLabel,
  isMediaUploadFileAccepted,
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
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  ...containerProps
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const pickerLabel = label ?? getMediaUploadLabel(mediaType, multiple);
  const dropLabel = getMediaUploadDropLabel(mediaType, multiple);
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

    reportFiles(input.files);
    input.value = '';
  };

  /**
   * Reports an eligible selection through the component's existing toast and
   * callback contract. Drop filtering mirrors the native input's accept value.
   *
   * @param files - Files supplied by either the picker or a drop operation.
   * @returns Nothing; accepted filenames are announced and reported.
   */
  const reportFiles = (files: Iterable<File>) => {
    const acceptedFiles = Array.from(files).filter((file) =>
      isMediaUploadFileAccepted(file, mediaType),
    );
    const selectedFiles = multiple ? acceptedFiles : acceptedFiles.slice(0, 1);
    if (selectedFiles.length === 0) return;

    announceMediaUploadFiles(selectedFiles);
    onFilesSelected?.(selectedFiles.map((file) => file.name));
  };

  /**
   * Activates the drop treatment when files enter the surface. A depth counter
   * prevents nested artwork elements from making the highlight flicker.
   *
   * @param event - React drag event dispatched by the upload container.
   * @returns Nothing; only local drag presentation state is changed.
   */
  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragEnter?.(event);
    if (loading || disabled || !event.dataTransfer.types.includes('Files'))
      return;

    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  };

  /**
   * Keeps the browser from navigating to a dragged file and communicates that
   * the enabled surface performs a copy-style drop operation.
   *
   * @param event - React drag event dispatched while a file is over the surface.
   * @returns Nothing; browser drag behavior is adjusted in place.
   */
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragOver?.(event);
    if (!loading && !disabled) event.dataTransfer.dropEffect = 'copy';
  };

  /**
   * Removes the drop treatment after the pointer leaves the complete surface.
   *
   * @param event - React drag event dispatched by the upload container.
   * @returns Nothing; the nested-entry counter and visual state are updated.
   */
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragLeave?.(event);
    if (dragDepthRef.current > 0) dragDepthRef.current -= 1;
    if (dragDepthRef.current === 0) setIsDraggingFiles(false);
  };

  /**
   * Selects files dropped on the surface through the same reporting path as the
   * native picker, then clears all transient drag presentation state.
   *
   * @param event - React drop event containing the browser's transferred files.
   * @returns Nothing; accepted filenames are announced and reported.
   */
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDrop?.(event);
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
    if (loading || disabled) return;

    reportFiles(event.dataTransfer.files);
  };

  return (
    <div
      {...containerProps}
      aria-busy={loading || undefined}
      className={[
        'flex flex-col items-center justify-center gap-8 rounded-[2rem_0.75rem_2rem_0.75rem] px-6 py-12 transition-colors motion-reduce:transition-none',
        isDraggingFiles
          ? 'bg-primary-container'
          : 'bg-surface-container-low',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
          <Text aria-live="polite" color="muted" variant="label">
            {isDraggingFiles
              ? `${dropLabel} here`
              : `or ${dropLabel.toLowerCase()} here`}
          </Text>
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

import Cropper, { type Area, type Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { useEffect, useId, useRef, useState } from 'react';
import Button from '../Button';
import MediaUpload from '../MediaUpload';
import Text from '../Text';
import {
  cropAndCompressImage,
  type ImageCropArea,
  type ImageUploadPreset,
  validateImageUpload,
} from '../../../utils/imageProcessing';

interface ImageUploadFieldProps {
  /** Destination-specific crop shape, dimensions, and compression limits. */
  preset: ImageUploadPreset;
  /** Processed file currently owned by the consuming form. */
  value?: File;
  /** Previously saved image displayed until a new crop is accepted. */
  existingImageUrl?: string;
  /** Alternative text for the accepted or existing preview. */
  previewAlt: string;
  /** Label shown on the initial picker action. */
  label: string;
  /** Label shown when an image can be replaced. */
  replaceLabel?: string;
  /** Native form name assigned to the hidden file input. */
  name: string;
  /** Height of the non-editing picker surface. */
  pickerHeight?: number;
  /** Prevents selection and crop confirmation. */
  disabled?: boolean;
  /** Receives the accepted crop for draft state or immediate persistence. */
  onAccept: (file: File) => void | Promise<void>;
  /** Runs after canceling a crop; omitting it returns to the picker. */
  onCancelEdit?: () => void;
  /** Reports whether the crop editor is active or processing. */
  onCropStatusChange?: (status: ImageCropStatus) => void;
  /** Text for confirming a crop. */
  acceptLabel?: string;
  /** Text for canceling a crop. */
  cancelLabel?: string;
  /** Text shown while processing or saving the selected crop. */
  processingLabel?: string;
  /** Shows an accepted image in the field; disable when acceptance closes it. */
  showAcceptedPreview?: boolean;
  /** Optional layout classes applied to the field container. */
  className?: string;
}

export interface ImageCropStatus {
  /** Whether a source image is being cropped. */
  active: boolean;
  /** Whether the accepted crop is being processed or saved. */
  processing: boolean;
}

/**
 * Provides image selection, interactive fixed-aspect cropping, zoom, preview,
 * processing, errors, and object-URL cleanup as one reusable form field.
 *
 * @param props - Destination preset, field copy, value, and acceptance callback.
 * @returns A shared image upload field that swaps between picker and crop stages.
 */
const ImageUploadField = ({
  preset,
  value,
  existingImageUrl,
  previewAlt,
  label,
  replaceLabel = 'Replace image',
  name,
  pickerHeight = 384,
  disabled = false,
  onAccept,
  onCancelEdit,
  onCropStatusChange,
  acceptLabel = 'Use image',
  cancelLabel = 'Cancel crop',
  processingLabel = 'Preparing…',
  showAcceptedPreview = true,
  className,
}: ImageUploadFieldProps) => {
  const zoomId = useId();
  const [sourceFile, setSourceFile] = useState<File>();
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [processedPreview, setProcessedPreview] = useState<{
    file: File;
    url: string;
  }>();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<ImageCropArea>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>();
  const sourceUrlRef = useRef<string | undefined>(undefined);
  const previewUrlRef = useRef<string | undefined>(undefined);
  const previewUrl =
    value && processedPreview?.file === value
      ? processedPreview.url
      : existingImageUrl;

  useEffect(
    () => () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  /**
   * Validates a new source and opens a centered crop session for accepted files.
   *
   * @param files - Files selected or dropped through the shared media picker.
   * @returns Nothing; crop-session state is initialized synchronously.
   */
  const handleFilesPicked = (files: readonly File[]) => {
    const file = files[0];
    if (!file) return;

    const validationError = validateImageUpload(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    const nextSourceUrl = URL.createObjectURL(file);
    sourceUrlRef.current = nextSourceUrl;
    setSourceFile(file);
    setSourceUrl(nextSourceUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropArea(undefined);
    setError(undefined);
    onCropStatusChange?.({ active: true, processing: false });
  };

  /**
   * Stores the cropper's final source-pixel rectangle for output rendering.
   *
   * @param _area - Percentage crop supplied by the cropper and unused here.
   * @param pixels - Crop rectangle measured against the source image.
   * @returns Nothing; the latest crop rectangle is retained.
   */
  const handleCropComplete = (_area: Area, pixels: Area) => {
    setCropArea(pixels);
  };

  /**
   * Clears the active crop session and releases its temporary source URL.
   *
   * @returns Nothing; transient source and crop state are reset.
   */
  const clearCropState = () => {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    sourceUrlRef.current = undefined;
    setSourceFile(undefined);
    setSourceUrl(undefined);
    setCropArea(undefined);
    setError(undefined);
    onCropStatusChange?.({ active: false, processing: false });
  };

  /**
   * Abandons the current source while preserving the last accepted image.
   *
   * @returns Nothing; transient crop state and its object URL are cleared.
   */
  const cancelCrop = () => {
    if (isProcessing) return;
    clearCropState();
    onCancelEdit?.();
  };

  /**
   * Renders and compresses the selected crop, then reports the processed file.
   *
   * @returns A promise resolving after preview and consumer state are updated.
   */
  const acceptCrop = async () => {
    if (!sourceFile || !cropArea || isProcessing) return;

    setIsProcessing(true);
    onCropStatusChange?.({ active: true, processing: true });
    setError(undefined);
    try {
      const processedFile = await cropAndCompressImage(
        sourceFile,
        cropArea,
        preset,
      );

      await onAccept(processedFile);
      if (!showAcceptedPreview) {
        clearCropState();
        return;
      }
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const nextPreviewUrl = URL.createObjectURL(processedFile);
      previewUrlRef.current = nextPreviewUrl;
      setProcessedPreview({ file: processedFile, url: nextPreviewUrl });
      clearCropState();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to prepare this image.',
      );
    } finally {
      setIsProcessing(false);
      if (sourceUrlRef.current) {
        onCropStatusChange?.({ active: true, processing: false });
      }
    }
  };

  return (
    <div className={className}>
      {sourceUrl ? (
        <div className="rounded-panel bg-surface-container-low p-4">
          <div className="relative h-72 overflow-hidden rounded-xl bg-on-surface">
            <Cropper
              aspect={preset.aspect}
              crop={crop}
              cropShape={preset.cropShape}
              disableAutomaticStylesInjection
              image={sourceUrl}
              onCropChange={setCrop}
              onCropComplete={handleCropComplete}
              onZoomChange={setZoom}
              roundCropAreaPixels
              showGrid={preset.cropShape === 'rect'}
              zoom={zoom}
            />
          </div>

          <div className="mt-5 grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <Text as="label" htmlFor={zoomId} variant="label">
                Zoom
              </Text>
              <Text color="muted" variant="caption">
                {Math.round(zoom * 100)}%
              </Text>
            </div>
            <input
              aria-valuetext={`${Math.round(zoom * 100)}%`}
              className="w-full accent-primary"
              disabled={disabled || isProcessing}
              id={zoomId}
              max={3}
              min={1}
              onChange={(event) => setZoom(Number(event.target.value))}
              step={0.01}
              type="range"
              value={zoom}
            />
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              disabled={disabled || isProcessing}
              onClick={cancelCrop}
              variant="ghost"
            >
              {cancelLabel}
            </Button>
            <Button
              disabled={disabled || !cropArea || isProcessing}
              onClick={() => void acceptCrop()}
            >
              {isProcessing ? processingLabel : acceptLabel}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {previewUrl ? (
            <img
              alt={previewAlt}
              className={[
                'mx-auto mb-4 object-cover',
                preset.cropShape === 'round'
                  ? 'aspect-square size-28 rounded-full'
                  : 'aspect-video w-full rounded-panel',
              ].join(' ')}
              src={previewUrl}
            />
          ) : null}
          <div className={previewUrl ? 'flex justify-center' : undefined}>
            <MediaUpload
              buttonOnly={Boolean(previewUrl)}
              disabled={disabled}
              height={pickerHeight}
              label={previewUrl ? replaceLabel : label}
              mediaType="image"
              name={name}
              onFilesPicked={handleFilesPicked}
            />
          </div>
        </>
      )}

      <Text
        className="mt-3"
        color={error ? 'error' : 'muted'}
        role={error ? 'alert' : undefined}
        variant="caption"
      >
        {error ?? 'JPEG, PNG, or WebP, up to 16 MB.'}
      </Text>
    </div>
  );
};

export default ImageUploadField;

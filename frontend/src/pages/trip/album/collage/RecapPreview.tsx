import { useQueryClient } from '@tanstack/react-query';
import { Download, Share2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Skeleton, Text } from '../../../../components/common';
import { photoContentOptions } from '../../../../queries/photos';
import {
  canShareImage,
  downloadImage,
  shareImage,
} from '../../../../utils/shareImage';
import { formatRecapDate, type RecapSlide } from './dailyRecap';
import { renderRecap } from './renderRecap';

/** Reserves identical portrait space for loading, failure, and the actual export.
 * @param props - Content to paint in the responsive 4:5 frame.
 * @returns A stable image footprint at mobile and desktop sizes.
 */
export const RecapImageFrame = ({ children }: { children: ReactNode }) => (
  <div
    className="relative mx-auto aspect-[4/5] w-full max-w-[32dvh] sm:max-w-[44dvh]"
    data-cy="recap-frame"
  >
    {children}
  </div>
);

/** Generates only the current image and discards late or obsolete private output.
 * @param props - Slide, trip name, account and UTC today; shared by every recap format.
 * @returns The exact JPEG preview with reserved skeleton space and explicit file actions.
 */
const RecapPreview = ({
  slide,
  tripName,
  userId,
  today,
}: {
  slide: RecapSlide;
  tripName: string;
  userId: string;
  today: string;
}) => {
  const client = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    file: File;
    url: string;
  }>();
  const [failure, setFailure] = useState<{ key: string; message: string }>();
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
  const key = JSON.stringify({ slide, tripName, userId, today, attempt });
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    const input: {
      slide: RecapSlide;
      tripName: string;
      userId: string;
      today: string;
      attempt: number;
    } = JSON.parse(key);
    void renderRecap({
      ...input,
      signal: controller.signal,
      loadPhoto: (photo) =>
        client.fetchQuery({
          ...photoContentOptions(input.userId, photo),
          ...(input.attempt > 0 ? { staleTime: 0 } : {}),
        }),
    })
      .then((blob) => {
        if (controller.signal.aborted) return;
        const kind = input.slide.kind ?? 'daily';
        const prefix = kind === 'daily' ? 'trip-recap' : `${kind}-recap`;
        const group = kind === 'experience' ? `-${input.slide.groupId}` : '';
        const file = new File(
          [blob],
          `${prefix}-${input.slide.date}${group}-${String(input.slide.index + 1).padStart(2, '0')}.jpg`,
          { type: 'image/jpeg' },
        );
        url = URL.createObjectURL(blob);
        setResult({ key, file, url });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setFailure({
            key,
            message:
              error instanceof Error
                ? error.message
                : 'The image couldn’t be generated. Please retry.',
          });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [key, client]);
  const output = result?.key === key ? result : undefined;
  const error = failure?.key === key ? failure.message : undefined;
  const shareSupported = Boolean(output && canShareImage(output.file));
  /** Hands off an already-generated file; cancellation is not an error. */
  const handleShare = () => {
    if (!output) return;
    setShareError('');
    setSharing(true);
    void shareImage(output.file)
      .catch(() =>
        setShareError(
          'Sharing couldn’t open. Try again, or download the image.',
        ),
      )
      .finally(() => setSharing(false));
  };
  const labels = [...new Set(slide.moments.map((moment) => moment.label))];
  return (
    <div className="space-y-4" data-cy="recap-preview">
      <RecapImageFrame>
        {!output && !error && (
          <div
            role="status"
            aria-label="Creating your recap"
            className="absolute inset-0"
            data-cy="recap-skeleton"
          >
            <Skeleton className="h-full w-full" />
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
          >
            <Text>{error}</Text>
            <Button
              variant="outline"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry image
            </Button>
          </div>
        )}
        {output && (
          <img
            src={output.url}
            alt={`Recap for ${slide.dateLabel ?? formatRecapDate(slide.date)}: ${labels.join(', ')}`}
            width={1080}
            height={1350}
            className="absolute inset-0 h-full w-full object-contain"
            data-cy="recap-image"
          />
        )}
      </RecapImageFrame>
      <div className="mx-auto grid min-h-11 max-w-sm grid-cols-2 gap-3">
        {!output && !error && (
          <Skeleton className="col-span-2 h-11 rounded-full" />
        )}
        {output && (
          <>
            {shareSupported && (
              <Button
                leadingIcon={<Share2 size={18} />}
                disabled={sharing}
                onClick={handleShare}
                aria-label="Share image"
                data-cy="recap-share"
              >
                Share
              </Button>
            )}
            <Button
              variant={shareSupported ? 'outline' : 'primary'}
              className={!shareSupported ? 'col-span-2' : ''}
              leadingIcon={<Download size={18} />}
              onClick={() => downloadImage(output.file)}
              aria-label="Download image"
              data-cy="recap-download"
            >
              Download
            </Button>
          </>
        )}
      </div>
      {shareError && (
        <Text role="alert" color="error">
          {shareError}
        </Text>
      )}
      <ul className="sr-only">
        {labels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </div>
  );
};
export default RecapPreview;

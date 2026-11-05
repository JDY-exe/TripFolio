import { useEffect, useRef, useState } from 'react';
import { Button, Skeleton, Text } from '../../../components/common';
import { usePhotoContent, type TripPhoto } from '../../../queries/photos';
import { MapPin } from 'lucide-react';

interface AlbumPhotoProps {
  photo: TripPhoto;
  expanded?: boolean;
  events?: any[];
}

/** Lazily downloads protected images and releases each object URL on cleanup.
 * @param props - Photo metadata and whether the image is in the full-size viewer.
 * @returns An image with loading and retryable failure states.
 */
const AlbumPhoto = ({ photo, expanded = false, events = [] }: AlbumPhotoProps) => {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(expanded);
  const [source, setSource] = useState('');
  const [decodeFailed, setDecodeFailed] = useState(false);
  const { data, isError, refetch, isFetching } = usePhotoContent(
    photo,
    visible,
  );
  const linkedEvent = photo.linkedEvent 
    ? events.find(e => e._id === photo.linkedEvent)
    : null;

  useEffect(() => {
    if (!container.current || expanded) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [expanded]);

  useEffect(() => {
    if (!data) return;
    const url = URL.createObjectURL(data);
    const frame = requestAnimationFrame(() => {
      setSource(url);
      setDecodeFailed(false);
    });
    return () => {
      cancelAnimationFrame(frame);
      URL.revokeObjectURL(url);
    };
  }, [data]);

  return (
    <div
      ref={container}
      className="relative h-full w-full"
      aria-busy={isFetching}
    >
      {!source && !isError && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      )}
      {source && !decodeFailed && (
        <img
          src={source}
          alt={photo.originalName}
          width={photo.width}
          height={photo.height}
          decoding="async"
          onError={() => setDecodeFailed(true)}
          className={`h-full w-full ${expanded ? 'object-contain' : 'object-cover'}`}
        />
      )}

      {/* Visual Event Tag Indicator */}
      {source && !decodeFailed && linkedEvent && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm z-20">
          <MapPin size={12} />
          <span className="truncate max-w-[120px]">{linkedEvent.title}</span>
        </div>
      )}
      
      {(isError || decodeFailed) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-container-low p-2 text-center">
          <Text variant="caption" color="muted">
            Photo unavailable
          </Text>
          {expanded && (
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => {
                setDecodeFailed(false);
                void refetch();
              }}
            >
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default AlbumPhoto;
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  IconButton,
  Skeleton,
  Text,
} from '../../../../components/common';
import type { RecapKind } from './dailyRecap';
import { getRecapGroups, RECAP_FORMATS } from './highlights';
import RecapPreview, { RecapImageFrame } from './RecapPreview';
import { useHighlights } from './useHighlights';

/** Browses every recap format through the same selector, navigation and export UI.
 * @param props - Trip/account scope and the selected format; unmounting releases output.
 * @returns Exclusive loading, error, empty or preview states with stable generation geometry.
 */
const RecapBrowser = ({
  tripId,
  userId,
  kind,
}: {
  tripId: string;
  userId: string;
  kind: RecapKind;
}) => {
  const recap = useHighlights(tripId, kind);
  const format = RECAP_FORMATS.find((item) => item.kind === kind)!;
  const [selection, setSelection] = useState<{
    groupId: string;
    index: number;
  }>();
  const groups = getRecapGroups(recap.slides, kind);
  const selected =
    groups.find((group) => group.id === selection?.groupId) ?? groups.at(-1);
  const slides = selected?.slides ?? [];
  const index = Math.min(
    selection?.groupId === selected?.id ? (selection?.index ?? 0) : 0,
    Math.max(0, slides.length - 1),
  );
  const slide = slides[index];
  return (
    <div className="space-y-4" data-cy="recap-content">
      {recap.loading && (
        <div
          role="status"
          aria-label="Preparing highlights"
          className="space-y-4"
        >
          <Skeleton className="h-11 w-48 rounded-lg" />
          <RecapImageFrame>
            <Skeleton className="h-full w-full" />
          </RecapImageFrame>
          <Skeleton className="mx-auto h-11 max-w-sm rounded-full" />
        </div>
      )}
      {recap.error && (
        <div role="alert" className="space-y-3 py-8">
          <Text>Your highlights couldn’t load.</Text>
          <Button variant="outline" onClick={recap.retry}>
            Retry recap
          </Button>
        </div>
      )}
      {!recap.loading && !recap.error && !slide && (
        <div className="space-y-3 py-8">
          <Text variant="title">{format.empty}</Text>
          <Text color="muted">
            {recap.photos.length === 0
              ? 'Add photos to your album to get started.'
              : format.hint}
          </Text>
        </div>
      )}
      {!recap.loading && !recap.error && slide && selected && (
        <div className="space-y-4">
          <div className="flex min-h-11 items-center justify-between gap-2">
            {kind !== 'dining' && (
              <div className="min-w-0">
                <Text
                  as="label"
                  htmlFor="recap-group"
                  variant="label"
                  className="sr-only"
                >
                  {kind === 'daily' ? 'Trip day' : 'Experience'}
                </Text>
                <select
                  id="recap-group"
                  value={selected.id}
                  onChange={(event) =>
                    setSelection({ groupId: event.target.value, index: 0 })
                  }
                  className="min-h-11 max-w-full rounded-lg bg-surface px-2 text-sm text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
                  data-cy="recap-group"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {kind === 'dining' && (
              <Text variant="caption" color="muted">
                Restaurant memories
              </Text>
            )}
            {slides.length > 1 && (
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label="Previous recap image"
                  icon={<ChevronLeft size={20} />}
                  disabled={index === 0}
                  onClick={() =>
                    setSelection({ groupId: selected.id, index: index - 1 })
                  }
                  data-cy="recap-previous"
                />
                <Text
                  variant="caption"
                  aria-live="polite"
                  className="whitespace-nowrap"
                >
                  <span className="sr-only">Image </span>
                  {index + 1} of {slides.length}
                </Text>
                <IconButton
                  label="Next recap image"
                  icon={<ChevronRight size={20} />}
                  disabled={index === slides.length - 1}
                  onClick={() =>
                    setSelection({ groupId: selected.id, index: index + 1 })
                  }
                  data-cy="recap-next"
                />
              </div>
            )}
          </div>
          <RecapPreview
            key={`${kind}-${selected.id}-${slide.index}`}
            slide={slide}
            tripName={recap.tripName}
            userId={userId}
            today={recap.today}
          />
        </div>
      )}
      {!recap.error && (recap.loading || Boolean(slide)) && (
        <Text variant="caption" color="muted" className="text-center">
          Exported photos leave TripFolio. Trip privacy stays unchanged.
        </Text>
      )}
    </div>
  );
};
export default RecapBrowser;

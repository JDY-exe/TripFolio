import { CalendarDays, Camera, ChevronRight, Utensils } from 'lucide-react';
import { Button, Text } from '../../../../components/common';
import type { RecapKind } from './dailyRecap';
import { RECAP_FORMATS } from './highlights';

const recapIcons = {
  daily: CalendarDays,
  dining: Utensils,
  experience: Camera,
};

/** Offers compact, keyboard-accessible routes into the shared recap browser.
 * @param props - Selection callback; data loads only after choosing a format.
 * @returns Three icon-and-label rows without artwork or secondary descriptions.
 */
const HighlightChooser = ({
  onChoose,
}: {
  onChoose: (kind: RecapKind) => void;
}) => (
  <div className="space-y-1" data-cy="highlight-chooser">
    {RECAP_FORMATS.map((format) => {
      const Icon = recapIcons[format.kind];
      return (
        <Button
          key={format.kind}
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => onChoose(format.kind)}
          data-cy={`highlight-${format.kind}`}
          className="justify-start rounded-xl text-left"
          leadingIcon={<Icon size={22} aria-hidden className="shrink-0" />}
          trailingIcon={
            <ChevronRight size={18} aria-hidden className="shrink-0" />
          }
        >
          <Text as="span" variant="label" className="min-w-0 flex-1">
            {format.title}
          </Text>
        </Button>
      );
    })}
  </div>
);
export default HighlightChooser;

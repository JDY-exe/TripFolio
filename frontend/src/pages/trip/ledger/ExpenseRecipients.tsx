import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { Button, Text } from '../../../components/common';
import type { TripTraveler } from '../../../queries/trips';
import ExpensePerson from './ExpensePerson';
import { useRecipientPreview } from './useRecipientPreview';

interface ExpenseRecipientsProps {
  recipientIds: string[];
  travelers: TripTraveler[];
}

/** Shows inline recipients up to half the card width, then expands overflow using itinerary motion.
 * @param props - Ordered split IDs and trip members used to resolve usernames and photos.
 * @returns A measured preview and an accessible, animated wrapping recipient list.
 */
const ExpenseRecipients = ({
  recipientIds,
  travelers,
}: ExpenseRecipientsProps) => {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const { previewRef, measureRef, visibleCount } = useRecipientPreview(
    recipientIds,
    travelers,
  );
  const hiddenCount = recipientIds.length - visibleCount;
  const hasOverflow = hiddenCount > 0;

  return (
    <div
      className="relative min-w-0"
      data-cy="expense-recipients"
      aria-label="People paid for"
    >
      <div
        ref={previewRef}
        className="flex w-[max(50%,12rem)] max-w-[calc(100%-5rem)] items-center gap-3"
        data-cy="expense-recipient-preview"
      >
        {recipientIds.slice(0, visibleCount).map((id) => (
          <ExpensePerson
            key={id}
            traveler={travelers.find((traveler) => traveler.id === id)}
          />
        ))}
        {hasOverflow && (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            data-cy="expense-recipient-toggle"
            aria-label={
              expanded
                ? 'Collapse recipients'
                : `Show ${hiddenCount} other recipients`
            }
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((current) => !current)}
            trailingIcon={
              <ChevronDown
                aria-hidden
                size={16}
                className={`motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-standard ${expanded ? 'rotate-180' : ''}`}
              />
            }
          >
            +{hiddenCount}
          </Button>
        )}
        {recipientIds.length === 0 && (
          <Text as="span" variant="label" color="muted">
            No recipients
          </Text>
        )}
      </div>

      <div
        aria-hidden
        inert
        className="invisible pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div ref={measureRef} className="flex w-max items-center gap-3">
          {recipientIds.map((id) => (
            <span key={id} data-recipient-measure className="flex shrink-0">
              <ExpensePerson
                traveler={travelers.find((traveler) => traveler.id === id)}
              />
            </span>
          ))}
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            trailingIcon={<ChevronDown aria-hidden size={16} />}
          >
            +{recipientIds.length}
          </Button>
        </div>
      </div>

      <div
        id={detailsId}
        data-cy="expense-recipient-details"
        aria-hidden={!expanded || !hasOverflow}
        inert={!expanded || !hasOverflow}
        className={`grid min-h-0 overflow-hidden motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-standard ${expanded && hasOverflow ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 pr-20 pt-2 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-standard ${expanded ? 'translate-y-0' : '-translate-y-2'}`}
          >
            {recipientIds.slice(visibleCount).map((id) => (
              <ExpensePerson
                key={id}
                traveler={travelers.find((traveler) => traveler.id === id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseRecipients;

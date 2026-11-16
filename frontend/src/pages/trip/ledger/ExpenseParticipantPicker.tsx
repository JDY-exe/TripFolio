import { useId, useState } from 'react';
import { Search } from 'lucide-react';
import {
  AvatarToggle,
  Button,
  Text,
  TextField,
} from '../../../components/common';
import type { TripTraveler } from '../../../queries/trips';

interface ExpenseParticipantPickerProps {
  travelers: TripTraveler[];
  currentUserId?: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
  error?: string;
  shareLabel?: string;
}

/** Selects expense recipients in a searchable avatar grid without losing filtered-out selections.
 * @param props - Trip members, controlled selection, current user, and form validation state.
 * @returns A stable-order, three-to-four-column picker whose Select all action covers the entire trip.
 */
const ExpenseParticipantPicker = ({
  travelers,
  currentUserId,
  selectedIds,
  onSelectionChange,
  disabled = false,
  error,
  shareLabel,
}: ExpenseParticipantPickerProps) => {
  const id = useId();
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const filtered = travelers.filter(
    (traveler) =>
      traveler.username.toLocaleLowerCase().includes(query) ||
      (traveler.id === currentUserId && 'you'.includes(query)),
  );

  /** Toggles one member while retaining every other selection, including hidden search matches.
   * @param travelerId - Member to include or remove from the equal split.
   * @returns Nothing; delegates the next complete selection to the expense form.
   */
  const toggle = (travelerId: string) =>
    onSelectionChange(
      selectedIds.includes(travelerId)
        ? selectedIds.filter((value) => value !== travelerId)
        : [...selectedIds, travelerId],
    );

  return (
    <section
      aria-labelledby={`${id}-label`}
      className="min-w-0"
      data-cy="expense-participant-picker"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Text
            as="h3"
            variant="body"
            className="font-medium"
            id={`${id}-label`}
            data-cy="expense-split-label"
            aria-live="polite"
          >
            Paid for{' '}
            <Text
              as="span"
              variant="label"
              color="muted"
              className="font-normal"
            >
              {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'person' : 'people'}
            </Text>
          </Text>
          {!!shareLabel && (
            <Text
              variant="caption"
              color="primary"
              data-cy="expense-share"
              aria-live="polite"
              className="mt-1 tabular-nums"
            >
              {shareLabel}
            </Text>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || travelers.length === 0}
          data-cy="expense-select-all"
          onClick={() =>
            onSelectionChange(travelers.map((traveler) => traveler.id))
          }
        >
          Select all
        </Button>
      </div>
      <TextField
        id={`${id}-search`}
        name="participantSearch"
        label="Search travelers"
        hideLabel
        leadingIcon={<Search aria-hidden size={18} />}
        placeholder="Search by username"
        type="search"
        autoComplete="off"
        value={search}
        disabled={disabled || travelers.length === 0}
        data-cy="expense-participant-search"
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
          if (event.key === 'Escape' && search) {
            event.stopPropagation();
            setSearch('');
          }
        }}
      />
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-3 grid min-w-0 grid-cols-3 gap-x-2 gap-y-1 sm:grid-cols-4"
        data-cy="expense-participant-grid"
      >
        {filtered.map((traveler) => (
          <AvatarToggle
            key={traveler.id}
            label={traveler.id === currentUserId ? 'You' : traveler.username}
            imageUrl={traveler.profile_picture}
            selected={selectedIds.includes(traveler.id)}
            onToggle={() => toggle(traveler.id)}
            disabled={disabled}
            data-cy={`expense-person-${traveler.id}`}
          />
        ))}
      </div>
      <div aria-live="polite">
        {travelers.length === 0 && (
          <Text color="muted" className="mt-3">
            No travelers are available for this trip.
          </Text>
        )}
        {travelers.length > 0 && filtered.length === 0 && (
          <Text
            color="muted"
            className="mt-3"
            data-cy="expense-participant-empty"
          >
            No travelers match your search.
          </Text>
        )}
      </div>
      {!!error && (
        <Text
          id={`${id}-error`}
          color="error"
          variant="caption"
          role="alert"
          className="mt-2"
          data-cy="expense-split-error"
        >
          {error}
        </Text>
      )}
    </section>
  );
};

export default ExpenseParticipantPicker;

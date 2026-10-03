import { useEffect, useId, useState } from 'react';
import { Text, TextField } from '../../../components/common';
import { usePlaceSuggestions } from '../../../queries/places';
import type { PlaceSuggestion } from '../../../queries/places';

interface EventPlaceFieldProps {
  value: string;
  placeId: string | null;
  onChange: (value: string, placeId: string | null) => void;
}

/** Lets an event use a Google place or retain a custom location.
 * @param props - Current location text, matched place, and change callback.
 * @returns An accessible location input with optional place suggestions.
 */
const EventPlaceField = ({
  value,
  placeId,
  onChange,
}: EventPlaceFieldProps) => {
  const listId = useId();
  const [searchOpen, setSearchOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedQuery(value.trim()),
      400,
    );
    return () => window.clearTimeout(timeout);
  }, [value]);

  const ready =
    searchOpen && value.trim().length >= 2 && debouncedQuery === value.trim();
  const { suggestions, isFetching, isError } = usePlaceSuggestions(
    debouncedQuery,
    ready,
  );
  const matches = suggestions.filter(
    (
      suggestion,
    ): suggestion is PlaceSuggestion & {
      placePrediction: NonNullable<PlaceSuggestion['placePrediction']>;
    } =>
      Boolean(
        suggestion.placePrediction?.placeId &&
        suggestion.placePrediction.text?.text,
      ),
  );

  /** Selects one suggestion and saves its stable Google place ID.
   * @param suggestion - Place prediction chosen by the user.
   * @returns Nothing.
   */
  const selectSuggestion = (suggestion: (typeof matches)[number]) => {
    onChange(
      suggestion.placePrediction.text.text,
      suggestion.placePrediction.placeId,
    );
    setSearchOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setSearchOpen(false);
        }
      }}
    >
      <TextField
        id="event-address"
        label="Location"
        hint={
          placeId
            ? 'Place linked for an attraction photo.'
            : 'Choose a place for a photo, or enter a custom location.'
        }
        value={value}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={ready}
        aria-controls={ready ? listId : undefined}
        aria-activedescendant={
          ready && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        onFocus={() => setSearchOpen(true)}
        onChange={(event) => {
          onChange(event.target.value, null);
          setSearchOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setSearchOpen(false);
            setActiveIndex(-1);
          } else if (event.key === 'ArrowDown' && matches.length > 0 && ready) {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % matches.length);
          } else if (event.key === 'ArrowUp' && matches.length > 0 && ready) {
            event.preventDefault();
            setActiveIndex((index) =>
              index <= 0 ? matches.length - 1 : index - 1,
            );
          } else if (event.key === 'Enter' && ready && activeIndex >= 0) {
            event.preventDefault();
            selectSuggestion(matches[activeIndex]);
          }
        }}
      />
      {ready ? (
        <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-outline-variant bg-surface-container-low p-1 shadow-lg">
          {matches.length > 0 ? (
            <div id={listId} role="listbox" aria-label="Matching places">
              {matches.map((suggestion, index) => (
                <button
                  key={suggestion.placePrediction.placeId}
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => selectSuggestion(suggestion)}
                  className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-primary-container focus-visible:bg-primary-container focus-visible:outline-none"
                >
                  {suggestion.placePrediction.text.text}
                </button>
              ))}
            </div>
          ) : (
            <Text variant="caption" color="muted" className="px-3 py-2">
              {isFetching
                ? 'Searching places…'
                : isError
                  ? 'Place search is unavailable. You can enter a custom location.'
                  : 'No matches. You can enter a custom location.'}
            </Text>
          )}
          <Text variant="caption" color="muted" className="px-3 pb-1 pt-2">
            Suggestions from Google Maps
          </Text>
        </div>
      ) : null}
    </div>
  );
};

export default EventPlaceField;

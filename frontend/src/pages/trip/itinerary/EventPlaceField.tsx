import { useEffect, useId, useState } from 'react';
import {
  BedDouble,
  Clapperboard,
  Landmark,
  MapPin,
  ShoppingBag,
  TrainFront,
  Trees,
  UtensilsCrossed,
} from 'lucide-react';
import { Text, TextField } from '../../../components/common';
import { usePlaceSuggestions } from '../../../queries/places';
import type { PlaceSuggestion } from '../../../queries/places';

interface EventPlaceFieldProps {
  value: string;
  placeId: string | null;
  onChange: (value: string, placeId: string | null) => void;
}

/** Chooses a familiar visual category from a prediction's Google place types.
 * @param types - All types supplied for one place prediction.
 * @returns A Lucide icon component, falling back to the location pin.
 */
const getPlaceIcon = (types: readonly string[]) => {
  if (
    types.some((type) =>
      /restaurant|cafe|coffee|bakery|bar|food|diner|pub|brewery/.test(type),
    )
  ) {
    return UtensilsCrossed;
  }
  if (
    types.some((type) =>
      /museum|art_gallery|cultural|historical|monument|castle/.test(type),
    )
  ) {
    return Landmark;
  }
  if (
    types.some((type) =>
      /park|garden|zoo|aquarium|hiking|wildlife|natural_feature/.test(type),
    )
  ) {
    return Trees;
  }
  if (
    types.some((type) =>
      /hotel|hostel|motel|lodging|resort|guest_house|bed_and_breakfast/.test(
        type,
      ),
    )
  ) {
    return BedDouble;
  }
  if (
    types.some((type) =>
      /theater|theatre|concert|amusement|entertainment|event_venue|stadium|casino/.test(
        type,
      ),
    )
  ) {
    return Clapperboard;
  }
  if (
    types.some((type) =>
      /airport|station|transit|terminal|bus_stop|subway|train/.test(type),
    )
  ) {
    return TrainFront;
  }
  if (
    types.some((type) =>
      /store|shop|shopping|market|mall|supermarket/.test(type),
    )
  ) {
    return ShoppingBag;
  }
  return types.some((type) =>
    /tourist_attraction|landmark|observation_deck/.test(type),
  )
    ? Landmark
    : MapPin;
};

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
          if (event.key === 'Escape' && searchOpen) {
            event.stopPropagation();
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
        <div className="absolute inset-x-0 top-22 z-20 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-lg">
          {matches.length > 0 ? (
            <div
              id={listId}
              role="listbox"
              aria-label="Matching places"
              className="max-h-72 overflow-y-auto p-1"
            >
              {matches.map((suggestion, index) => {
                const prediction = suggestion.placePrediction;
                const PlaceIcon = getPlaceIcon(prediction.types ?? []);
                const name =
                  prediction.structuredFormat?.mainText?.text ||
                  prediction.text.text;
                const location =
                  prediction.structuredFormat?.secondaryText?.text;
                return (
                  <button
                    key={prediction.placeId}
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-on-surface outline-none hover:bg-primary-container focus-visible:bg-primary-container aria-selected:bg-primary-container"
                  >
                    <span className="flex min-w-0 items-start gap-2.5">
                      <PlaceIcon
                        aria-hidden="true"
                        size={18}
                        className="mt-0.5 shrink-0 text-primary"
                      />
                      <span className="min-w-0 break-words text-sm font-medium leading-5">
                        {name}
                      </span>
                    </span>
                    {location ? (
                      <span className="mt-1 flex min-w-0 items-start gap-2.5 text-sm leading-5 text-on-surface-variant">
                        <MapPin
                          aria-hidden="true"
                          size={16}
                          className="mt-0.5 shrink-0"
                        />
                        <span className="min-w-0 break-words">{location}</span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
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
        </div>
      ) : null}
    </div>
  );
};

export default EventPlaceField;

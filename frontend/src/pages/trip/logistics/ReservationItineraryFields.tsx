import { Button, Text, TextField } from '../../../components/common';
import { actionLabels } from './useItineraryActions';
import type { useItineraryActions } from './useItineraryActions';

interface Props {
  state: ReturnType<typeof useItineraryActions>;
  dates: readonly string[];
  locations: readonly string[];
  onEditDetails?: () => void;
}
/** Shows optional boundary actions with mandatory, user-confirmed slots.
 * @param props - Action draft state and corresponding booking dates.
 * @returns Accessible action selection and time controls.
 */
const ReservationItineraryFields = ({
  state,
  dates,
  locations,
  onEditDetails,
}: Props) => (
  <section data-cy="reservation-itinerary-step" aria-label="Add to itinerary">
    {state.loading && !state.isError && (
      <Text role="status">Loading itinerary entries…</Text>
    )}
    {state.isError && (
      <>
        <Text role="alert" color="error">
          Could not load itinerary entries. Retry before saving.
        </Text>
        <Button variant="outline" onClick={() => void state.retry()}>
          Retry
        </Button>
      </>
    )}
    {state.datesChanged && (
      <label className="mb-4 flex items-start gap-3 text-sm">
        <input
          data-cy="confirm-action-dates"
          type="checkbox"
          checked={state.datesConfirmed}
          onChange={(event) => state.confirmDates(event.target.checked)}
          className="mt-1 accent-primary"
        />
        <span>
          I reviewed the action dates and times below for this changed booking.
        </span>
      </label>
    )}
    {!state.loading &&
      !state.isError &&
      state.drafts.map((draft, index) => (
        <fieldset key={draft.eventType} className="mb-5 min-w-0">
          <legend className="mb-2">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                data-cy={`action-${draft.eventType}`}
                type="checkbox"
                checked={draft.selected}
                onChange={(event) =>
                  state.setDrafts((current) =>
                    current.map((item, i) =>
                      i === index
                        ? { ...item, selected: event.target.checked }
                        : item,
                    ),
                  )
                }
                className="accent-primary"
              />
              {actionLabels[draft.eventType]} ·{' '}
              {dates[index] || 'Choose a booking date'}
            </label>
          </legend>
          <Text variant="caption" color="muted" className="mb-3">
            {locations[index] || 'No location added in Details.'}
          </Text>
          {!locations[index] && draft.selected && onEditDetails && (
            <Button
              data-cy="edit-action-location"
              variant="outline"
              size="sm"
              className="mb-3"
              onClick={onEditDetails}
            >
              Add location in Details
            </Button>
          )}
          {draft.selected && (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id={`${draft.eventType}-start`}
                data-cy={`${draft.eventType}-start`}
                label="Start time"
                type="time"
                required
                value={draft.start}
                onChange={(event) => {
                  const start = event.target.value;
                  const end = new Date(`2000-01-01T${start}:00.000Z`);
                  end.setUTCMinutes(end.getUTCMinutes() + 30);
                  state.setDrafts((current) =>
                    current.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            start,
                            end: Number.isFinite(end.getTime())
                              ? end.toISOString().slice(11, 16)
                              : '',
                            nextDay:
                              Number.isFinite(end.getTime()) &&
                              end.getUTCDate() === 2,
                          }
                        : item,
                    ),
                  );
                }}
              />
              <TextField
                id={`${draft.eventType}-end`}
                data-cy={`${draft.eventType}-end`}
                label="End time"
                type="time"
                required
                value={draft.end}
                onChange={(event) =>
                  state.setDrafts((current) =>
                    current.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            end: event.target.value,
                            nextDay: event.target.value < item.start,
                          }
                        : item,
                    ),
                  )
                }
                hint={draft.nextDay ? 'Ends the following day.' : undefined}
              />
            </div>
          )}
        </fieldset>
      ))}
    {!state.loading &&
      !state.isError &&
      state.drafts.every((draft) => !draft.selected) && (
        <Text role="status" color="muted">
          No events selected. Only the reservation will be saved.
        </Text>
      )}
  </section>
);
export default ReservationItineraryFields;

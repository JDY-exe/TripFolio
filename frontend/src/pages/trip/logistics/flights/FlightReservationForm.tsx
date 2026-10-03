import { Plane } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Modal,
  Stepper,
  Text,
  TextField,
} from '../../../../components/common';
import {
  ReservationType,
  useSaveReservation,
} from '../../../../queries/reservations';
import type {
  Reservation,
  ReservationInput,
} from '../../../../queries/reservations';
import { getApiErrorMessage } from '../../../../utils/api';
import {
  FlightWizardStep,
  createFlightDraft,
  flightWizardSteps,
  normalizeFlightChanges,
  validateFlightStep,
} from './flightWizard';
import type { FlightDraft } from './flightWizard';

interface FlightReservationFormProps {
  tripId: string;
  reservation?: Reservation;
  onClose: () => void;
}

/**
 * Formats a browser-local input date for the review ticket.
 * @param value - A datetime-local field value.
 * @returns A short date in the user's locale.
 */
const previewDate = (value: string): string =>
  new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * Reads the entered clock time without converting it to an airport time zone.
 * @param value - A datetime-local field value.
 * @returns The entered hour and minute.
 */
const previewTime = (value: string): string => value.slice(11, 16);

/**
 * Presents a four-step editor for a single flight reservation.
 * @param props - Trip, optional reservation to edit, and close action.
 * @returns An interactive flight form that saves through the reservation mutation.
 */
const FlightReservationForm = ({
  tripId,
  reservation,
  onClose,
}: FlightReservationFormProps) => {
  const saveReservation = useSaveReservation(tripId);
  const [draft, setDraft] = useState<FlightDraft>(() =>
    createFlightDraft(reservation),
  );
  const [step, setStep] = useState<FlightWizardStep>(FlightWizardStep.Route);
  const [error, setError] = useState('');
  const stepContentRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    stepContentRef.current?.focus();
  }, [step]);

  /**
   * Updates one or more draft fields and clears the previous validation error.
   * @param changes - New values for the edited flight fields.
   * @returns Nothing.
   */
  const updateDraft = (changes: Partial<FlightDraft>) => {
    setDraft((current) => ({
      ...current,
      ...normalizeFlightChanges(changes),
    }));
    setError('');
  };

  /**
   * Validates the active step before moving forward.
   * @returns Nothing; the current step or error may change.
   */
  const handleNext = () => {
    const message = validateFlightStep(step, draft);
    if (message) {
      setError(message);
      return;
    }
    const next = flightWizardSteps[step + 1];
    if (next) setStep(next.value);
  };

  /**
   * Moves backward while preserving all locally entered values.
   * @returns Nothing; the active step changes when a previous step exists.
   */
  const handleBack = () => {
    const previous = flightWizardSteps[step - 1];
    if (previous) {
      setError('');
      setStep(previous.value);
    }
  };

  /**
   * Saves the completed flight and closes the dialog after the list refreshes.
   * @returns A promise that settles after the save request.
   */
  const handleSave = async () => {
    const values: ReservationInput = {
      name: draft.name.trim(),
      startTime: new Date(draft.startTime).toISOString(),
      endTime: new Date(draft.endTime).toISOString(),
      confirmationNumber: draft.confirmationNumber.trim(),
      cost: draft.cost.trim() ? Number(draft.cost) : null,
      notes: draft.notes.trim(),
      flights: {
        flightNum: draft.flightNum.trim(),
        departAirport: draft.departAirport.trim(),
        arriveAirport: draft.arriveAirport.trim(),
      },
    };
    setError('');
    try {
      await saveReservation.mutateAsync({
        type: ReservationType.Flights,
        values,
        id: reservation?._id,
      });
      onClose();
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          'Could not save the flight. Please try again.',
        ),
      );
      stepContentRef.current?.scrollIntoView({ block: 'start' });
    }
  };

  return (
    <Modal
      open
      title="Flight information"
      description={
        reservation
          ? 'Edit your flight information.'
          : 'Input your flight information.'
      }
      onClose={() => {
        if (!saveReservation.isPending) onClose();
      }}
      panelClassName="flex h-[min(42rem,calc(76dvh_-_2rem))] flex-col sm:h-[min(42rem,calc(100dvh_-_4rem))] sm:max-w-3xl"
      contentClassName="min-h-0 flex-1 overflow-y-auto"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={saveReservation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step !== FlightWizardStep.Route ? (
              <Button
                variant="outline"
                disabled={saveReservation.isPending}
                onClick={handleBack}
              >
                Back
              </Button>
            ) : null}
            {step !== FlightWizardStep.Review ? (
              <Button disabled={saveReservation.isPending} onClick={handleNext}>
                Next: {flightWizardSteps[step + 1].label}
              </Button>
            ) : (
              <Button
                disabled={saveReservation.isPending}
                onClick={() => void handleSave()}
              >
                {saveReservation.isPending ? 'Saving...' : 'Save flight'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <Stepper
        steps={flightWizardSteps}
        currentStep={step}
        label="Flight form progress"
      />
      <div ref={stepContentRef} tabIndex={-1} className="mt-7 outline-none">
        <Text as="h3" variant="title" className="mb-4">
          {flightWizardSteps[step].label}
        </Text>
        {error ? (
          <Text role="alert" color="error" className="mb-4">
            {error}
          </Text>
        ) : null}

        {step === FlightWizardStep.Route ? (
          <div className="overflow-hidden rounded-[1.75rem_1.75rem_1.75rem_1.75rem] border border-outline-variant bg-surface-container-low">
            <div className="px-5 pt-5">
              <TextField
                id="flight-number"
                label="Airline code and flight number"
                className="max-w-64"
                value={draft.flightNum}
                autoCapitalize="characters"
                onChange={(event) =>
                  updateDraft({ flightNum: event.target.value })
                }
                placeholder="UA1234"
              />
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              <div className="grid gap-4">
                <TextField
                  id="flight-depart-airport"
                  label="Departure airport"
                  value={draft.departAirport}
                  maxLength={3}
                  autoCapitalize="characters"
                  onChange={(event) =>
                    updateDraft({ departAirport: event.target.value })
                  }
                  required
                />
                <TextField
                  id="flight-departure"
                  label="Departure date and time"
                  type="datetime-local"
                  value={draft.startTime}
                  onChange={(event) =>
                    updateDraft({ startTime: event.target.value })
                  }
                  required
                />
              </div>
              <div
                className="hidden items-center gap-2 text-primary sm:flex"
                aria-hidden="true"
              >
                <span className="w-4 border-t border-2 border-dashed border-outline" />
                <Plane size={20} className="rotate-45" />
                <span className="w-4 border-t border-2 border-dashed border-outline" />
              </div>
              <div className="grid gap-4">
                <TextField
                  id="flight-arrive-airport"
                  label="Arrival airport"
                  value={draft.arriveAirport}
                  maxLength={3}
                  autoCapitalize="characters"
                  onChange={(event) =>
                    updateDraft({ arriveAirport: event.target.value })
                  }
                  required
                />
                <TextField
                  id="flight-arrival"
                  label="Arrival date and time"
                  type="datetime-local"
                  value={draft.endTime}
                  onChange={(event) =>
                    updateDraft({ endTime: event.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>
        ) : null}

        {step === FlightWizardStep.Booking ? (
          <div className="grid gap-4 rounded-panel bg-surface-container-low p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                id="flight-name"
                label="Flight name"
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                required
                placeholder="e.g., Flight to NYC"
              />
            </div>
            <TextField
              id="flight-confirmation"
              label="Confirmation number"
              value={draft.confirmationNumber}
              onChange={(event) =>
                updateDraft({ confirmationNumber: event.target.value })
              }
              placeholder="e.g., ABC123"
            />
            <label
              className="grid gap-2 text-sm font-medium sm:col-span-2"
              htmlFor="flight-notes"
            >
              Notes
              <textarea
                id="flight-notes"
                rows={3}
                value={draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
                className="rounded-xl border border-outline bg-surface-container-low p-3 text-on-surface"
              />
            </label>
          </div>
        ) : null}

        {step === FlightWizardStep.Cost ? (
          <div className="rounded-panel bg-surface-container-low p-5">
            <TextField
              id="flight-cost"
              label="Cost"
              type="number"
              min="0"
              step="0.01"
              value={draft.cost}
              onChange={(event) => updateDraft({ cost: event.target.value })}
            />
          </div>
        ) : null}

        {step === FlightWizardStep.Review ? (
          <article className="overflow-hidden rounded-[1.75rem_0.75rem_1.75rem_0.75rem] bg-surface-container-low">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-[1rem_0.5rem_1rem_0.5rem] bg-primary-container text-on-primary-container">
                  <Plane aria-hidden size={22} />
                </div>
                <div>
                  <Text as="h4" variant="label" className="font-medium">
                    {draft.flightNum}
                  </Text>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
                <div>
                  <Text className="text-3xl tracking-tight">
                    {draft.departAirport}
                  </Text>
                  <time
                    dateTime={draft.startTime}
                    className="mt-3 block text-lg font-medium tabular-nums"
                  >
                    {previewTime(draft.startTime)}
                  </time>
                  <time
                    dateTime={draft.startTime}
                    className="block text-xs text-on-surface-variant"
                  >
                    {previewDate(draft.startTime)}
                  </time>
                </div>
                <div
                  className="flex items-center gap-2 text-primary"
                  aria-hidden="true"
                >
                  <span className="hidden w-8 border-t border-dashed border-outline-variant sm:block" />
                  <Plane size={18} className="rotate-45" />
                  <span className="hidden w-8 border-t border-dashed border-outline-variant sm:block" />
                </div>
                <div className="text-right">
                  <Text className="text-3xl tracking-tight">
                    {draft.arriveAirport}
                  </Text>
                  <time
                    dateTime={draft.endTime}
                    className="mt-3 block text-lg font-medium tabular-nums"
                  >
                    {previewTime(draft.endTime)}
                  </time>
                  <time
                    dateTime={draft.endTime}
                    className="block text-xs text-on-surface-variant"
                  >
                    {previewDate(draft.endTime)}
                  </time>
                </div>
              </div>
              <Text variant="caption" color="muted" className="mt-4">
                Notes
              </Text>
              {draft.notes ? (
                <Text
                  color="muted"
                  className="mt-4 whitespace-pre-wrap text-sm"
                >
                  {draft.notes}
                </Text>
              ) : null}
            </div>
            <div className="relative flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-outline-variant px-5 py-4 text-sm text-on-surface-variant before:absolute before:-left-2 before:-top-2 before:size-4 before:rounded-full before:bg-surface after:absolute after:-right-2 after:-top-2 after:size-4 after:rounded-full after:bg-surface sm:px-6">
              <span className="font-medium text-on-surface">{draft.name}</span>
              {draft.confirmationNumber ? (
                <span>Confirmation: {draft.confirmationNumber}</span>
              ) : null}
              <span>
                Cost:{' '}
                {draft.cost.trim()
                  ? Number(draft.cost).toFixed(2)
                  : 'Not provided'}
              </span>
            </div>
          </article>
        ) : null}
      </div>
    </Modal>
  );
};

export default FlightReservationForm;

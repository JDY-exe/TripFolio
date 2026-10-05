import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Modal,
  Stepper,
  Text,
  TextArea,
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
  createFlightSegment,
  flightWizardSteps,
  removeFlightSegment,
  updateFlightSegment,
  validateFlightStep,
} from './flightWizard';
import type { FlightDraft } from './flightWizard';
import type { FlightSegment } from '../../../../queries/reservations';
import FlightJourneyTimeline from './FlightJourneyTimeline';

interface FlightReservationFormProps {
  tripId: string;
  reservation?: Reservation;
  onClose: () => void;
}

/**
 * Presents a four-step editor for a flight journey.
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
  const [isOpen, setIsOpen] = useState(true);
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
      ...changes,
    }));
    setError('');
  };

  /** Updates one route leg while maintaining its connection to the next. */
  const updateSegment = (index: number, changes: Partial<FlightSegment>) => {
    setDraft((current) => ({
      ...current,
      segments: updateFlightSegment(current.segments, index, changes),
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
    const routeError = validateFlightStep(FlightWizardStep.Route, draft);
    if (routeError) {
      setError(routeError);
      setStep(FlightWizardStep.Route);
      return;
    }
    const values: ReservationInput = {
      name: draft.name.trim(),
      startTime: `${draft.segments[0].departTime}:00.000Z`,
      endTime: `${draft.segments.at(-1)!.arriveTime}:00.000Z`,
      confirmationNumber: draft.confirmationNumber.trim(),
      cost: draft.cost.trim() ? Number(draft.cost) : null,
      notes: draft.notes.trim(),
      flights: {
        flightNum: draft.segments[0].flightNum.trim(),
        departAirport: draft.segments[0].departAirport.trim(),
        arriveAirport: draft.segments.at(-1)!.arriveAirport.trim(),
        segments: draft.segments.map((segment) => ({
          ...segment,
          flightNum: segment.flightNum.trim(),
        })),
      },
    };
    setError('');
    try {
      await saveReservation.mutateAsync({
        type: ReservationType.Flights,
        values,
        id: reservation?._id,
      });
      setIsOpen(false);
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
      open={isOpen}
      title="Flight journey"
      description={
        reservation
          ? 'Edit the legs and booking details for this journey.'
          : 'Add each leg of your journey, including connections.'
      }
      onClose={() => {
        if (!saveReservation.isPending) onClose();
      }}
      onExited={onClose}
      dismissDisabled={saveReservation.isPending}
      panelClassName="flex h-[calc(100dvh_-_2rem)] max-h-[56rem] flex-col sm:h-[calc(100dvh_-_4rem)] sm:max-w-3xl"
      contentClassName="min-h-0 flex-1 overflow-y-auto"
      footer={(requestClose) => (
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={saveReservation.isPending}
            onClick={requestClose}
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
      )}
    >
      <Stepper
        steps={flightWizardSteps}
        currentStep={step}
        label="Flight form progress"
        className="sticky top-0 z-10 border-b border-outline-variant bg-surface-container py-4"
      />
      <div
        ref={stepContentRef}
        tabIndex={-1}
        className="mt-6 scroll-mt-24 outline-none"
      >
        <Text as="h3" variant="title" className="mb-4">
          {flightWizardSteps[step].label}
        </Text>
        {error ? (
          <Text role="alert" color="error" className="mb-4">
            {error}
          </Text>
        ) : null}

        {step === FlightWizardStep.Route ? (
          <div className="space-y-4">
            <Text color="muted" className="text-sm">
              Enter the local date and time shown on your ticket at each
              airport.
            </Text>
            {draft.segments.map((segment, index) => (
              <div key={index}>
                {index > 0 ? (
                  <div className="mb-4 flex items-center gap-2 rounded-panel bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
                    <span className="font-semibold">
                      Layover in{' '}
                      {segment.departAirport || 'your connection airport'}
                    </span>
                    <span>· Next flight departs here</span>
                  </div>
                ) : null}
                <section
                  aria-labelledby={`flight-leg-${index}`}
                  className="rounded-panel border border-outline-variant bg-surface-container-low p-5"
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <Text
                      as="h4"
                      id={`flight-leg-${index}`}
                      variant="label"
                      className="font-semibold"
                    >
                      Leg {index + 1}
                    </Text>
                    {draft.segments.length > 1 ? (
                      <Button
                        size="sm"
                        variant="dangerGhost"
                        leadingIcon={<Trash2 aria-hidden size={15} />}
                        onClick={() =>
                          updateDraft({
                            segments: removeFlightSegment(
                              draft.segments,
                              index,
                            ),
                          })
                        }
                      >
                        Remove leg
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <TextField
                        id={`flight-number-${index}`}
                        label="Airline code and flight number"
                        className="max-w-64"
                        value={segment.flightNum}
                        autoCapitalize="characters"
                        onChange={(event) =>
                          updateSegment(index, {
                            flightNum: event.target.value,
                          })
                        }
                        placeholder="UA1234"
                        required
                      />
                    </div>
                    {index === 0 ? (
                      <TextField
                        id={`flight-depart-airport-${index}`}
                        label="Departure airport"
                        value={segment.departAirport}
                        maxLength={3}
                        autoCapitalize="characters"
                        onChange={(event) =>
                          updateSegment(index, {
                            departAirport: event.target.value,
                          })
                        }
                        placeholder="SFO"
                        required
                      />
                    ) : (
                      <div className="rounded-panel px-4 py-3">
                        <Text variant="label" color="muted">
                          Departure airport
                        </Text>
                        <Text variant="body" className="mt-2 font-semibold">
                          {segment.departAirport || 'Enter previous arrival'}
                        </Text>
                      </div>
                    )}
                    <TextField
                      id={`flight-arrive-airport-${index}`}
                      label="Arrival airport"
                      value={segment.arriveAirport}
                      maxLength={3}
                      autoCapitalize="characters"
                      onChange={(event) =>
                        updateSegment(index, {
                          arriveAirport: event.target.value,
                        })
                      }
                      placeholder="ORD"
                      required
                    />
                    <TextField
                      id={`flight-departure-${index}`}
                      label="Departure date and local time"
                      type="datetime-local"
                      value={segment.departTime}
                      onChange={(event) =>
                        updateSegment(index, { departTime: event.target.value })
                      }
                      required
                    />
                    <TextField
                      id={`flight-arrival-${index}`}
                      label="Arrival date and local time"
                      type="datetime-local"
                      value={segment.arriveTime}
                      onChange={(event) =>
                        updateSegment(index, { arriveTime: event.target.value })
                      }
                      required
                    />
                  </div>
                </section>
              </div>
            ))}
            <Button
              variant="outline"
              leadingIcon={<Plus aria-hidden size={18} />}
              onClick={() =>
                updateDraft({
                  segments: [
                    ...draft.segments,
                    createFlightSegment(draft.segments.at(-1)?.arriveAirport),
                  ],
                })
              }
            >
              Add layover / next flight
            </Button>
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
              <TextArea
                id="flight-notes"
                rows={3}
                value={draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
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
              <Text as="h4" variant="title">
                {draft.name}
              </Text>
              <Text variant="caption" color="muted" className="mt-1">
                {draft.segments.length === 1
                  ? 'Nonstop flight'
                  : `${draft.segments.length - 1} ${draft.segments.length === 2 ? 'layover' : 'layovers'}`}
              </Text>
              <FlightJourneyTimeline segments={draft.segments} />
              {draft.notes ? (
                <Text
                  color="muted"
                  className="mt-3 whitespace-pre-wrap text-sm"
                >
                  {draft.notes}
                </Text>
              ) : null}
            </div>
            <div className="relative flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-outline-variant px-5 py-4 text-sm text-on-surface-variant before:absolute before:-left-2 before:-top-2 before:size-4 before:rounded-full before:bg-surface after:absolute after:-right-2 after:-top-2 after:size-4 after:rounded-full after:bg-surface sm:px-6">
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

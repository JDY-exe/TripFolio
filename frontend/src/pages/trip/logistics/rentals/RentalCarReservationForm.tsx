import { CalendarDays, CarFront } from 'lucide-react';
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
import { getApiErrorMessage, getFromApi } from '../../../../utils/api';
import { paths } from '../../../../queries/reservations';
import { useEditorSnapshot } from '../../../../queries/useEditorSnapshot';
import {
  reservationDateToTimestamp,
  toReservationDateInput,
} from '../reservationDateInput';

import PlaceField from '../../../../components/PlaceField';
import ReservationItineraryFields from '../ReservationItineraryFields';
import ReservationBookingFields from '../ReservationBookingFields';
import { useItineraryActions } from '../useItineraryActions';

interface RentalCarReservationFormProps {
  tripId: string;
  reservation?: Reservation;
  onClose: () => void;
}

interface RentalCarDraft {
  name: string;
  company: string;
  startDate: string;
  endDate: string;
  cost: string;
  notes: string;
  confirmationNumber: string;
}

const rentalSteps = [
  { label: 'Details' },
  { label: 'Booking' },
  { label: 'Itinerary' },
] as const;

/**
 * Creates editable rental values from a reservation or empty fields.
 * @param reservation - The rental reservation being edited, when present.
 * @returns Values suitable for the rental form inputs.
 */
const createRentalCarDraft = (reservation?: Reservation): RentalCarDraft => ({
  name: reservation?.name ?? '',
  company: reservation?.rentals?.company ?? '',
  startDate: toReservationDateInput(reservation?.startTime),
  endDate: toReservationDateInput(reservation?.endTime),
  cost: reservation?.cost?.toString() ?? '',
  notes: reservation?.notes ?? '',
  confirmationNumber: reservation?.confirmationNumber ?? '',
});

/**
 * Separates rental details, optional booking records, and itinerary actions into three steps.
 * @param props - Trip, optional rental reservation, and close action.
 * @returns The rental car reservation modal.
 */
const RentalCarReservationForm = ({
  tripId,
  reservation,
  onClose,
}: RentalCarReservationFormProps) => {
  const saveReservation = useSaveReservation(tripId);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [draft, setDraft] = useState<RentalCarDraft>(() =>
    createRentalCarDraft(reservation),
  );
  const [pickupAddress, setPickupAddress] = useState(
    reservation?.rentals?.pickupAddress ?? '',
  );
  const [pickupPlaceId, setPickupPlaceId] = useState<string | null>(
    reservation?.rentals?.pickupPlaceId ?? null,
  );
  const [returnAddress, setReturnAddress] = useState(
    reservation?.rentals?.returnAddress ?? '',
  );
  const [returnPlaceId, setReturnPlaceId] = useState<string | null>(
    reservation?.rentals?.returnPlaceId ?? null,
  );
  const itinerary = useItineraryActions(
    reservation,
    ['rentalcar_pickup', 'rentalcar_return'],
    [draft.startDate, draft.endDate],
  );
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  const snapshot = useEditorSnapshot(
    reservation,
    () =>
      getFromApi<Reservation>(
        `/logistics/${paths[reservation!.type]}/${reservation!._id}`,
      ),
    (fresh) => {
      setDraft(createRentalCarDraft(fresh));
      setPickupAddress(fresh.rentals?.pickupAddress ?? '');
      setPickupPlaceId(fresh.rentals?.pickupPlaceId ?? null);
      setReturnAddress(fresh.rentals?.returnAddress ?? '');
      setReturnPlaceId(fresh.rentals?.returnPlaceId ?? null);
      if (fresh.itineraryActions) itinerary.rebase(fresh.itineraryActions);
    },
    isOpen,
  );

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    contentRef.current?.focus({ preventScroll: true });
    contentRef.current?.parentElement?.scrollTo({ top: 0 });
  }, [step]);

  /**
   * Merges changed rental fields into the current draft and clears errors.
   * @param changes - Fields changed by the form input.
   * @returns Nothing.
   */
  const updateDraft = (changes: Partial<RentalCarDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setError('');
  };

  /**
   * Checks rental identity and dates independently of optional itinerary actions.
   * @returns A Details error or an empty string.
   */
  const validateDetails = () => {
    const pickup = new Date(reservationDateToTimestamp(draft.startDate));
    const returnDate = new Date(reservationDateToTimestamp(draft.endDate));
    if (
      !draft.name.trim() ||
      !draft.company.trim() ||
      !draft.startDate ||
      !draft.endDate ||
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(returnDate.getTime())
    ) {
      return 'Enter a vehicle, rental company, and both dates.';
    }
    if (returnDate < pickup) {
      return 'Return cannot be before pick-up.';
    }
    return '';
  };

  /** Checks the optional booking cost before advancing to event creation.
   * @returns A cost error or an empty string.
   */
  const validateBooking = () =>
    draft.cost.trim() &&
    (!Number.isFinite(Number(draft.cost)) || Number(draft.cost) < 0)
      ? 'Cost must be zero or more.'
      : '';

  /** Validates only the visible step and keeps drafts intact when advancing.
   * @returns Nothing; changes the step or displays an actionable error.
   */
  const handleNext = () => {
    const message = step === 0 ? validateDetails() : validateBooking();
    setError(message);
    if (!message) setStep(step === 0 ? 1 : 2);
  };

  /**
   * Validates cost and saves the rental reservation through the shared mutation.
   * @returns A promise that settles after the save request.
   */
  const handleSave = async () => {
    const detailsError = validateDetails();
    const bookingError = validateBooking();
    if (detailsError || bookingError) {
      setError(detailsError || bookingError);
      setStep(detailsError ? 0 : 1);
      return;
    }
    const parsedCost = draft.cost.trim() ? Number(draft.cost) : null;
    if (itinerary.loading || itinerary.isError || itinerary.error) {
      setError(itinerary.error || 'Load itinerary entries before saving.');
      setStep(2);
      return;
    }
    if (
      (itinerary.drafts[0].selected && !pickupAddress.trim()) ||
      (itinerary.drafts[1].selected && !returnAddress.trim())
    ) {
      setError(
        'Add a location for each selected itinerary action here in Details, then return to Itinerary.',
      );
      setStep(0);
      return;
    }
    const values: ReservationInput = {
      name: draft.name,
      startTime: reservationDateToTimestamp(draft.startDate),
      endTime: reservationDateToTimestamp(draft.endDate),
      cost: parsedCost,
      confirmationNumber: draft.confirmationNumber,
      notes: draft.notes,
      rentals: {
        company: draft.company,
        pickupAddress,
        pickupPlaceId,
        returnAddress,
        returnPlaceId,
      },
      itineraryActions: itinerary.actions,
    };
    setError('');
    try {
      snapshot.startSaving();
      itinerary.startSaving();
      await saveReservation.mutateAsync({
        type: ReservationType.Rentals,
        values,
        id: reservation?._id,
        original: snapshot.original,
        originalEvents: itinerary.originalEvents,
        onRebase: (current, changes) => {
          snapshot.rebase(current, changes);
          itinerary.rebase(
            current.itineraryActions ?? [],
            changes.itineraryActions as typeof itinerary.actions | undefined,
          );
        },
      });
      setIsOpen(false);
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          'Could not save the rental car. Please try again.',
        ),
      );
      contentRef.current?.parentElement?.scrollTo({ top: 0 });
    }
  };

  return (
    <Modal
      data-cy="rental-form"
      open={isOpen}
      title={reservation ? 'Edit rental car' : 'Add rental car'}
      onClose={() => {
        if (!saveReservation.isPending) onClose();
      }}
      onExited={onClose}
      dismissDisabled={saveReservation.isPending}
      panelClassName="flex h-[min(42rem,calc(100dvh_-_2rem))] flex-col sm:h-[min(42rem,calc(100dvh_-_4rem))] sm:max-w-2xl"
      contentClassName="min-h-0 flex-1 overflow-y-auto"
      footer={(requestClose) => (
        <div className="grid w-full grid-cols-2 items-center gap-3 sm:flex sm:justify-between">
          <Button
            data-cy="rental-cancel"
            className="sm:mr-auto"
            variant="secondary"
            disabled={saveReservation.isPending}
            onClick={requestClose}
          >
            Cancel
          </Button>
          <div className="contents sm:flex sm:items-center sm:gap-2">
            {step > 0 && (
              <Button
                data-cy="rental-back"
                variant="outline"
                disabled={saveReservation.isPending}
                onClick={() => {
                  setError('');
                  setStep(step === 2 ? 1 : 0);
                }}
              >
                Back
              </Button>
            )}
            {step < 2 && (
              <Button
                data-cy="rental-next"
                className={step > 0 ? 'col-span-2' : ''}
                onClick={handleNext}
              >
                Next: {rentalSteps[step + 1].label}
              </Button>
            )}
            {step === 2 && (
              <Button
                data-cy="rental-save"
                className="col-span-2"
                disabled={saveReservation.isPending}
                onClick={() => void handleSave()}
              >
                {saveReservation.isPending ? 'Saving...' : 'Save rental car'}
              </Button>
            )}
          </div>
        </div>
      )}
    >
      <Stepper
        steps={rentalSteps}
        currentStep={step}
        label="Rental car form progress"
        className="sticky top-0 z-10 bg-surface-container py-3"
      />
      <div ref={contentRef} tabIndex={-1} className="mt-7 outline-none">
        <Text as="h3" variant="title" className="mb-4">
          {rentalSteps[step].label}
        </Text>
        {error && (
          <Text role="alert" color="error" className="mb-4">
            {error}
          </Text>
        )}

        {step === 0 && (
          <>
            <div className="rounded-[0.75rem_2rem_0.75rem_2rem] border border-outline-variant bg-surface-container-low">
              <div className="px-5 pt-5">
                <Text
                  as="h4"
                  variant="label"
                  className="flex items-center gap-2"
                >
                  <CarFront aria-hidden size={18} className="text-primary" />
                  Vehicle and rental company
                </Text>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <TextField
                  data-cy="rental-name"
                  id="rental-name"
                  label="Vehicle"
                  value={draft.name}
                  onChange={(event) =>
                    updateDraft({ name: event.target.value })
                  }
                  required
                />
                <TextField
                  data-cy="rental-company"
                  id="rental-company"
                  label="Rental company"
                  value={draft.company}
                  onChange={(event) =>
                    updateDraft({ company: event.target.value })
                  }
                  required
                />
              </div>
              <div className="border-t border-outline-variant p-5">
                <Text
                  as="h4"
                  variant="label"
                  className="mb-4 flex items-center gap-2"
                >
                  <CalendarDays
                    aria-hidden
                    size={18}
                    className="text-primary"
                  />
                  Rental dates
                </Text>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    data-cy="rental-pickup"
                    id="rental-pickup"
                    label="Pick-up date"
                    type="date"
                    value={draft.startDate}
                    onChange={(event) =>
                      updateDraft({ startDate: event.target.value })
                    }
                    required
                  />
                  <TextField
                    data-cy="rental-return"
                    id="rental-return"
                    label="Return date"
                    type="date"
                    value={draft.endDate}
                    onChange={(event) =>
                      updateDraft({ endDate: event.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 border-t border-outline-variant p-5">
                <PlaceField
                  id="rental-pickup-address"
                  label="Pickup address or place"
                  value={pickupAddress}
                  placeId={pickupPlaceId}
                  onChange={(value, id) => {
                    setPickupAddress(value);
                    setPickupPlaceId(id);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReturnAddress(pickupAddress);
                    setReturnPlaceId(pickupPlaceId);
                  }}
                >
                  Use pickup location for return
                </Button>
                <PlaceField
                  id="rental-return-address"
                  label="Return address or place"
                  value={returnAddress}
                  placeId={returnPlaceId}
                  onChange={(value, id) => {
                    setReturnAddress(value);
                    setReturnPlaceId(id);
                  }}
                />
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <ReservationBookingFields
            prefix="rental"
            cost={draft.cost}
            confirmationNumber={draft.confirmationNumber}
            notes={draft.notes}
            onCostChange={(cost) => updateDraft({ cost })}
            onConfirmationChange={(confirmationNumber) =>
              updateDraft({ confirmationNumber })
            }
            onNotesChange={(notes) => updateDraft({ notes })}
          />
        )}
        {step === 2 && (
          <ReservationItineraryFields
            state={itinerary}
            dates={[draft.startDate, draft.endDate]}
            locations={[pickupAddress, returnAddress]}
            onEditDetails={() => {
              setError('');
              setStep(0);
            }}
          />
        )}
      </div>
    </Modal>
  );
};

export default RentalCarReservationForm;

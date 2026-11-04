import { CalendarDays, MapPin } from 'lucide-react';
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
  reservationDateToTimestamp,
  toReservationDateInput,
} from '../reservationDateInput';

import PlaceField from '../../../../components/PlaceField';
import ReservationItineraryFields from '../ReservationItineraryFields';
import ReservationBookingFields from '../ReservationBookingFields';
import { useItineraryActions } from '../useItineraryActions';

interface AccommodationReservationFormProps {
  tripId: string;
  reservation?: Reservation;
  onClose: () => void;
}

const accommodationSteps = [
  { label: 'Details' },
  { label: 'Booking' },
  { label: 'Itinerary' },
] as const;

/**
 * Separates stay details, optional booking records, and itinerary actions into three steps.
 * @param props - Trip, optional accommodation reservation, and close action.
 * @returns The accommodation reservation modal.
 */
const AccommodationReservationForm = ({
  tripId,
  reservation,
  onClose,
}: AccommodationReservationFormProps) => {
  const saveReservation = useSaveReservation(tripId);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState(reservation?.name ?? '');
  const [address, setAddress] = useState(
    reservation?.accommodations?.address ?? '',
  );
  const [startDate, setStartDate] = useState(
    toReservationDateInput(reservation?.startTime),
  );
  const [endDate, setEndDate] = useState(
    toReservationDateInput(reservation?.endTime),
  );
  const [placeId, setPlaceId] = useState<string | null>(
    reservation?.accommodations?.placeId ?? null,
  );
  const itinerary = useItineraryActions(
    reservation,
    ['hotel_checkin', 'hotel_checkout'],
    [startDate, endDate],
  );
  const [cost, setCost] = useState(reservation?.cost?.toString() ?? '');
  const [notes, setNotes] = useState(reservation?.notes ?? '');
  const [confirmationNumber, setConfirmationNumber] = useState(
    reservation?.confirmationNumber ?? '',
  );
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    contentRef.current?.focus({ preventScroll: true });
    contentRef.current?.parentElement?.scrollTo({ top: 0 });
  }, [step]);

  /** Validates only stay identity and dates, without requiring itinerary times yet.
   * @returns A recoverable error, or an empty string when Details is complete.
   */
  const validateDetails = () => {
    const checkIn = new Date(reservationDateToTimestamp(startDate));
    const checkOut = new Date(reservationDateToTimestamp(endDate));
    if (
      !name.trim() ||
      !address.trim() ||
      !startDate ||
      !endDate ||
      Number.isNaN(checkIn.getTime()) ||
      Number.isNaN(checkOut.getTime())
    ) {
      return 'Enter a property name, address, and both dates.';
    }
    if (checkOut < checkIn) {
      return 'Check-out cannot be before check-in.';
    }
    return '';
  };

  /** Checks the optional booking cost without blocking on later itinerary fields.
   * @returns A cost error or an empty string.
   */
  const validateBooking = () =>
    cost.trim() && (!Number.isFinite(Number(cost)) || Number(cost) < 0)
      ? 'Cost must be zero or more.'
      : '';

  /** Advances only after validating the currently visible step.
   * @returns Nothing; preserves all draft values when changing steps.
   */
  const handleNext = () => {
    const message = step === 0 ? validateDetails() : validateBooking();
    setError(message);
    if (!message) setStep(step === 0 ? 1 : 2);
  };

  /**
   * Validates cost and saves the stay through the shared mutation.
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
    const parsedCost = cost.trim() ? Number(cost) : null;
    if (itinerary.loading || itinerary.isError || itinerary.error) {
      setError(itinerary.error || 'Load itinerary entries before saving.');
      setStep(2);
      return;
    }
    const values: ReservationInput = {
      name: name.trim(),
      startTime: reservationDateToTimestamp(startDate),
      endTime: reservationDateToTimestamp(endDate),
      cost: parsedCost,
      confirmationNumber: confirmationNumber.trim(),
      notes: notes.trim(),
      accommodations: { address: address.trim(), placeId },
      itineraryActions: itinerary.actions,
    };
    setError('');
    try {
      await saveReservation.mutateAsync({
        type: ReservationType.Accommodations,
        values,
        id: reservation?._id,
      });
      setIsOpen(false);
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          'Could not save the accommodation. Please try again.',
        ),
      );
      contentRef.current?.parentElement?.scrollTo({ top: 0 });
    }
  };

  return (
    <Modal
      data-cy="accommodation-form"
      open={isOpen}
      title={reservation ? 'Edit accommodation' : 'Add accommodation'}
      onClose={() => {
        if (!saveReservation.isPending) onClose();
      }}
      onExited={onClose}
      dismissDisabled={saveReservation.isPending}
      panelClassName="flex h-[min(48rem,calc(100dvh_-_2rem))] flex-col sm:h-[min(48rem,calc(100dvh_-_4rem))] sm:max-w-2xl"
      contentClassName="min-h-0 flex-1 overflow-y-auto"
      footer={(requestClose) => (
        <div className="grid w-full grid-cols-2 items-center gap-3 sm:flex sm:justify-between">
          <Button
            data-cy="accommodation-cancel"
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
                data-cy="accommodation-back"
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
                data-cy="accommodation-next"
                className={step > 0 ? 'col-span-2' : ''}
                onClick={handleNext}
              >
                Next: {accommodationSteps[step + 1].label}
              </Button>
            )}
            {step === 2 && (
              <Button
                data-cy="accommodation-save"
                className="col-span-2"
                disabled={saveReservation.isPending}
                onClick={() => void handleSave()}
              >
                {saveReservation.isPending ? 'Saving...' : 'Save accommodation'}
              </Button>
            )}
          </div>
        </div>
      )}
    >
      <Stepper
        steps={accommodationSteps}
        currentStep={step}
        label="Accommodation form progress"
        className="sticky top-0 z-10 bg-surface-container py-3"
      />
      <div ref={contentRef} tabIndex={-1} className="mt-7 outline-none">
        <Text as="h3" variant="title" className="mb-4">
          {accommodationSteps[step].label}
        </Text>
        {error && (
          <Text role="alert" color="error" className="mb-4">
            {error}
          </Text>
        )}

        {step === 0 && (
          <>
            <div className="rounded-[2rem_0.75rem_2rem_0.75rem] border border-outline-variant bg-surface-container-low">
              <div className="px-5 pt-5">
                <MapPin aria-hidden size={18} className="text-primary" />
              </div>
              <div className="grid gap-4 p-5 pt-3">
                <TextField
                  data-cy="accommodation-name"
                  id="accommodation-name"
                  label="Property name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
                <PlaceField
                  id="accommodation-address"
                  label="Property address or place"
                  value={address}
                  placeId={placeId}
                  onChange={(value, matchedPlaceId, _restaurant, placeName) => {
                    setAddress(value);
                    setPlaceId(matchedPlaceId);
                    if (!name.trim() && placeName) setName(placeName);
                  }}
                />
              </div>
              <div className="border-t border-outline-variant p-5">
                <div className="pb-2">
                  <CalendarDays
                    aria-hidden
                    size={18}
                    className="text-primary"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    data-cy="accommodation-check-in"
                    id="accommodation-check-in"
                    label="Check-in date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                  />
                  <TextField
                    data-cy="accommodation-check-out"
                    id="accommodation-check-out"
                    label="Check-out date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <ReservationBookingFields
            prefix="accommodation"
            cost={cost}
            confirmationNumber={confirmationNumber}
            notes={notes}
            onCostChange={setCost}
            onConfirmationChange={setConfirmationNumber}
            onNotesChange={setNotes}
          />
        )}
        {step === 2 && (
          <ReservationItineraryFields
            state={itinerary}
            dates={[startDate, endDate]}
            locations={[address, address]}
          />
        )}
      </div>
    </Modal>
  );
};

export default AccommodationReservationForm;

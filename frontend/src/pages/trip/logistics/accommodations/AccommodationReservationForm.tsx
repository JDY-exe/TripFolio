import { CalendarDays, MapPin, NotebookPen, ReceiptText } from 'lucide-react';
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

interface AccommodationReservationFormProps {
  tripId: string;
  reservation?: Reservation;
  onClose: () => void;
}

const accommodationSteps = [
  { label: 'Stay details' },
  { label: 'Cost' },
] as const;

/**
 * Edits accommodation details and cost in a two-step reservation dialog.
 * @param props - Trip, optional accommodation reservation, and close action.
 * @returns The accommodation reservation modal.
 */
const AccommodationReservationForm = ({
  tripId,
  reservation,
  onClose,
}: AccommodationReservationFormProps) => {
  const saveReservation = useSaveReservation(tripId);
  const [step, setStep] = useState<0 | 1>(0);
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
  const [cost, setCost] = useState(reservation?.cost?.toString() ?? '');
  const [notes, setNotes] = useState(reservation?.notes ?? '');
  const [error, setError] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    contentRef.current?.focus();
  }, [step]);

  /**
   * Checks the property and calendar range before showing cost.
   * @returns Nothing; the dialog advances or shows an error.
   */
  const handleNext = () => {
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
      setError('Enter a property name, address, and both dates.');
      return;
    }
    if (checkOut < checkIn) {
      setError('Check-out cannot be before check-in.');
      return;
    }
    setError('');
    setStep(1);
  };

  /**
   * Validates cost and saves the stay through the shared mutation.
   * @returns A promise that settles after the save request.
   */
  const handleSave = async () => {
    const parsedCost = cost.trim() ? Number(cost) : null;
    if (
      parsedCost !== null &&
      (!Number.isFinite(parsedCost) || parsedCost < 0)
    ) {
      setError('Cost must be zero or more.');
      return;
    }
    const values: ReservationInput = {
      name: name.trim(),
      startTime: reservationDateToTimestamp(startDate),
      endTime: reservationDateToTimestamp(endDate),
      cost: parsedCost,
      notes: notes.trim(),
      accommodations: { address: address.trim() },
    };
    setError('');
    try {
      await saveReservation.mutateAsync({
        type: ReservationType.Accommodations,
        values,
        id: reservation?._id,
      });
      onClose();
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          'Could not save the accommodation. Please try again.',
        ),
      );
      contentRef.current?.scrollIntoView({ block: 'start' });
    }
  };

  return (
    <Modal
      open
      title={reservation ? 'Edit accommodation' : 'Add accommodation'}
      onClose={() => {
        if (!saveReservation.isPending) onClose();
      }}
      panelClassName="flex h-[min(48rem,calc(100dvh_-_2rem))] flex-col sm:h-[min(48rem,calc(100dvh_-_4rem))] sm:max-w-2xl"
      contentClassName="min-h-0 flex-1 overflow-y-auto"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={saveReservation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step === 1 ? (
              <Button
                variant="outline"
                disabled={saveReservation.isPending}
                onClick={() => {
                  setError('');
                  setStep(0);
                }}
              >
                Back
              </Button>
            ) : null}
            {step === 0 ? (
              <Button onClick={handleNext}>Next: Cost</Button>
            ) : (
              <Button
                disabled={saveReservation.isPending}
                onClick={() => void handleSave()}
              >
                {saveReservation.isPending ? 'Saving...' : 'Save accommodation'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <Stepper
        steps={accommodationSteps}
        currentStep={step}
        label="Accommodation form progress"
      />
      <div ref={contentRef} tabIndex={-1} className="mt-7 outline-none">
        <Text as="h3" variant="title" className="mb-4">
          {accommodationSteps[step].label}
        </Text>
        {error ? (
          <Text role="alert" color="error" className="mb-4">
            {error}
          </Text>
        ) : null}

        {step === 0 ? (
          <>
            <div className="overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] border border-outline-variant bg-surface-container-low">
              <div className="px-5 pt-5">
                <MapPin aria-hidden size={18} className="text-primary" />
              </div>
              <div className="grid gap-4 p-5 pt-3">
                <TextField
                  id="accommodation-name"
                  label="Property name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
                <TextField
                  id="accommodation-address"
                  label="Address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  required
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
                    id="accommodation-check-in"
                    label="Check-in date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                  />
                  <TextField
                    id="accommodation-check-out"
                    label="Check-out date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="border-t border-outline-variant p-5">
                <NotebookPen aria-hidden size={18} className="text-primary" />
                <textarea
                  id="accommodation-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-outline bg-surface-container-low p-3 text-on-surface"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[2rem_0.75rem_2rem_0.75rem] bg-surface-container-low p-5 sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
                <ReceiptText aria-hidden size={22} />
              </div>
              <div>
                <Text as="h4" variant="label">
                  Accommodation cost
                </Text>
                <Text variant="caption" color="muted">
                  Add the total price for this stay.
                </Text>
              </div>
            </div>
            <TextField
              id="accommodation-cost"
              label="Cost"
              type="number"
              min="0"
              step="0.01"
              className="max-w-64"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AccommodationReservationForm;

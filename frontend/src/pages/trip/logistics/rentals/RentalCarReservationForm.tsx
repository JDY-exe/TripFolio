import { CalendarDays, CarFront, NotebookPen, ReceiptText } from 'lucide-react';
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

interface RentalCarReservationFormProps {
  tripId: string;
  reservation?: Reservation;
  onClose: () => void;
}

const rentalSteps = [{ label: 'Rental details' }, { label: 'Cost' }] as const;

/**
 * Edits rental details and cost in a two-step reservation dialog.
 * @param props - Trip, optional rental reservation, and close action.
 * @returns The rental car reservation modal.
 */
const RentalCarReservationForm = ({
  tripId,
  reservation,
  onClose,
}: RentalCarReservationFormProps) => {
  const saveReservation = useSaveReservation(tripId);
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState(reservation?.name ?? '');
  const [company, setCompany] = useState(reservation?.rentals?.company ?? '');
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
   * Checks the rental identity and calendar range before showing cost.
   * @returns Nothing; the dialog advances or shows an error.
   */
  const handleNext = () => {
    const pickup = new Date(reservationDateToTimestamp(startDate));
    const returnDate = new Date(reservationDateToTimestamp(endDate));
    if (
      !name.trim() ||
      !company.trim() ||
      !startDate ||
      !endDate ||
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(returnDate.getTime())
    ) {
      setError('Enter a vehicle, rental company, and both dates.');
      return;
    }
    if (returnDate < pickup) {
      setError('Return cannot be before pick-up.');
      return;
    }
    setError('');
    setStep(1);
  };

  /**
   * Validates cost and saves the rental reservation through the shared mutation.
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
      rentals: { company: company.trim() },
    };
    setError('');
    try {
      await saveReservation.mutateAsync({
        type: ReservationType.Rentals,
        values,
        id: reservation?._id,
      });
      onClose();
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          'Could not save the rental car. Please try again.',
        ),
      );
      contentRef.current?.scrollIntoView({ block: 'start' });
    }
  };

  return (
    <Modal
      open
      title={reservation ? 'Edit rental car' : 'Add rental car'}
      onClose={() => {
        if (!saveReservation.isPending) onClose();
      }}
      panelClassName="flex h-[min(42rem,calc(100dvh_-_2rem))] flex-col sm:h-[min(42rem,calc(100dvh_-_4rem))] sm:max-w-2xl"
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
                {saveReservation.isPending ? 'Saving...' : 'Save rental car'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <Stepper
        steps={rentalSteps}
        currentStep={step}
        label="Rental car form progress"
      />
      <div ref={contentRef} tabIndex={-1} className="mt-7 outline-none">
        <Text as="h3" variant="title" className="mb-4">
          {rentalSteps[step].label}
        </Text>
        {error ? (
          <Text role="alert" color="error" className="mb-4">
            {error}
          </Text>
        ) : null}

        {step === 0 ? (
          <>
            <div className="overflow-hidden rounded-[0.75rem_2rem_0.75rem_2rem] border border-outline-variant bg-surface-container-low">
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
                  id="rental-name"
                  label="Vehicle"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
                <TextField
                  id="rental-company"
                  label="Rental company"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
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
                    id="rental-pickup"
                    label="Pick-up date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                  />
                  <TextField
                    id="rental-return"
                    label="Return date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="border-t border-outline-variant p-5">
                <Text
                  as="label"
                  htmlFor="rental-notes"
                  variant="label"
                  className="flex items-center gap-2"
                >
                  <NotebookPen aria-hidden size={18} className="text-primary" />
                  Notes
                </Text>
                <textarea
                  id="rental-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-outline bg-surface-container-low p-3 text-on-surface"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[0.75rem_2rem_0.75rem_2rem] bg-surface-container-low p-5 sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
                <ReceiptText aria-hidden size={22} />
              </div>
              <div>
                <Text as="h4" variant="label">
                  Rental cost
                </Text>
                <Text variant="caption" color="muted">
                  Add the total price for this rental.
                </Text>
              </div>
            </div>
            <TextField
              id="rental-cost"
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

export default RentalCarReservationForm;

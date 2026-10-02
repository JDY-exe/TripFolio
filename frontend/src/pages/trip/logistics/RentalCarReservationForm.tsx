import { useState } from 'react';
import { Button, Modal, TextField } from '../../../components/common';
import {
  ReservationType,
  useSaveReservation,
} from '../../../queries/reservations';
import type {
  Reservation,
  ReservationInput,
} from '../../../queries/reservations';
import { getApiErrorMessage } from '../../../utils/api';
import { toLocalDateTimeInput } from './reservationDateInput';

interface RentalCarReservationFormProps {
  tripId: string;
  reservation?: Reservation;
  onClose: () => void;
}

/**
 * Edits rental car details independently of the other reservation forms.
 * @param props - Trip, optional rental reservation, and close action.
 * @returns The rental car reservation modal.
 */
const RentalCarReservationForm = ({
  tripId,
  reservation,
  onClose,
}: RentalCarReservationFormProps) => {
  const saveReservation = useSaveReservation(tripId);
  const [name, setName] = useState(reservation?.name ?? '');
  const [company, setCompany] = useState(reservation?.rentals?.company ?? '');
  const [startTime, setStartTime] = useState(
    toLocalDateTimeInput(reservation?.startTime),
  );
  const [endTime, setEndTime] = useState(
    toLocalDateTimeInput(reservation?.endTime),
  );
  const [confirmationNumber, setConfirmationNumber] = useState(
    reservation?.confirmationNumber ?? '',
  );
  const [cost, setCost] = useState(reservation?.cost?.toString() ?? '');
  const [notes, setNotes] = useState(reservation?.notes ?? '');
  const [error, setError] = useState('');

  /**
   * Validates and saves a rental car reservation.
   * @returns A promise that settles after the save request.
   */
  const handleSave = async () => {
    const pickup = new Date(startTime);
    const returnTime = new Date(endTime);
    if (
      !name.trim() ||
      !company.trim() ||
      !startTime ||
      !endTime ||
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(returnTime.getTime())
    ) {
      setError('Enter a vehicle, rental company, and both times.');
      return;
    }
    if (returnTime < pickup) {
      setError('Return cannot be before pick-up.');
      return;
    }
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
      startTime: pickup.toISOString(),
      endTime: returnTime.toISOString(),
      confirmationNumber: confirmationNumber.trim(),
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
    }
  };

  return (
    <Modal
      open
      title={reservation ? 'Edit rental car' : 'Add rental car'}
      onClose={() => {
        if (!saveReservation.isPending) onClose();
      }}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={saveReservation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={saveReservation.isPending}
            onClick={() => void handleSave()}
          >
            {saveReservation.isPending ? 'Saving...' : 'Save rental car'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            id="rental-name"
            label="Vehicle"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            id="rental-company"
            label="Rental company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            required
          />
        </div>
        <TextField
          id="rental-pickup"
          label="Pick-up"
          type="datetime-local"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
        />
        <TextField
          id="rental-return"
          label="Return"
          type="datetime-local"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          required
        />
        <TextField
          id="rental-confirmation"
          label="Confirmation number"
          value={confirmationNumber}
          onChange={(event) => setConfirmationNumber(event.target.value)}
        />
        <TextField
          id="rental-cost"
          label="Cost"
          type="number"
          min="0"
          step="0.01"
          value={cost}
          onChange={(event) => setCost(event.target.value)}
        />
        <label
          className="grid gap-2 text-sm font-medium sm:col-span-2"
          htmlFor="rental-notes"
        >
          Notes
          <textarea
            id="rental-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-xl border border-outline bg-surface-container-low p-3 text-on-surface"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-error sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};

export default RentalCarReservationForm;

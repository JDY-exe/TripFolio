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

interface AccommodationReservationFormProps {
  tripId: string;
  reservation?: Reservation;
  onClose: () => void;
}

/**
 * Edits accommodation details independently of the other reservation forms.
 * @param props - Trip, optional accommodation reservation, and close action.
 * @returns The accommodation reservation modal.
 */
const AccommodationReservationForm = ({
  tripId,
  reservation,
  onClose,
}: AccommodationReservationFormProps) => {
  const saveReservation = useSaveReservation(tripId);
  const [name, setName] = useState(reservation?.name ?? '');
  const [address, setAddress] = useState(
    reservation?.accommodations?.address ?? '',
  );
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
   * Validates and saves an accommodation reservation.
   * @returns A promise that settles after the save request.
   */
  const handleSave = async () => {
    const checkIn = new Date(startTime);
    const checkOut = new Date(endTime);
    if (
      !name.trim() ||
      !address.trim() ||
      !startTime ||
      !endTime ||
      Number.isNaN(checkIn.getTime()) ||
      Number.isNaN(checkOut.getTime())
    ) {
      setError('Enter a property name, address, and both times.');
      return;
    }
    if (checkOut < checkIn) {
      setError('Check-out cannot be before check-in.');
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
      startTime: checkIn.toISOString(),
      endTime: checkOut.toISOString(),
      confirmationNumber: confirmationNumber.trim(),
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
    }
  };

  return (
    <Modal
      open
      title={reservation ? 'Edit accommodation' : 'Add accommodation'}
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
            {saveReservation.isPending ? 'Saving...' : 'Save accommodation'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            id="accommodation-name"
            label="Property name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            id="accommodation-address"
            label="Address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
          />
        </div>
        <TextField
          id="accommodation-check-in"
          label="Check-in"
          type="datetime-local"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
        />
        <TextField
          id="accommodation-check-out"
          label="Check-out"
          type="datetime-local"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          required
        />
        <TextField
          id="accommodation-confirmation"
          label="Confirmation number"
          value={confirmationNumber}
          onChange={(event) => setConfirmationNumber(event.target.value)}
        />
        <TextField
          id="accommodation-cost"
          label="Cost"
          type="number"
          min="0"
          step="0.01"
          value={cost}
          onChange={(event) => setCost(event.target.value)}
        />
        <label
          className="grid gap-2 text-sm font-medium sm:col-span-2"
          htmlFor="accommodation-notes"
        >
          Notes
          <textarea
            id="accommodation-notes"
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

export default AccommodationReservationForm;

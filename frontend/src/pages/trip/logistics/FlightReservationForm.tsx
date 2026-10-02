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

interface FlightReservationFormProps {
  tripId: string;
  reservation?: Reservation;
  onClose: () => void;
}

/**
 * Edits the flight details supported by the current reservation API.
 * @param props - Trip, optional flight reservation, and close action.
 * @returns The flight reservation modal.
 */
const FlightReservationForm = ({
  tripId,
  reservation,
  onClose,
}: FlightReservationFormProps) => {
  const saveReservation = useSaveReservation(tripId);
  const [name, setName] = useState(reservation?.name ?? '');
  const [airline, setAirline] = useState(reservation?.flights?.airline ?? '');
  const [flightNum, setFlightNum] = useState(
    reservation?.flights?.flightNum ?? '',
  );
  const [departAirport, setDepartAirport] = useState(
    reservation?.flights?.departAirport ?? '',
  );
  const [arriveAirport, setArriveAirport] = useState(
    reservation?.flights?.arriveAirport ?? '',
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
   * Validates and saves the flight, then closes the modal after query refresh.
   * @returns A promise that settles after the save request.
   */
  const handleSave = async () => {
    const departure = new Date(startTime);
    const arrival = new Date(endTime);
    if (
      ![name, airline, flightNum, departAirport, arriveAirport].every((value) =>
        value.trim(),
      ) ||
      !startTime ||
      !endTime ||
      Number.isNaN(departure.getTime()) ||
      Number.isNaN(arrival.getTime())
    ) {
      setError('Complete the flight details and both times.');
      return;
    }
    if (arrival < departure) {
      setError('Arrival cannot be before departure.');
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
      startTime: departure.toISOString(),
      endTime: arrival.toISOString(),
      confirmationNumber: confirmationNumber.trim(),
      cost: parsedCost,
      notes: notes.trim(),
      flights: {
        airline: airline.trim(),
        flightNum: flightNum.trim(),
        departAirport: departAirport.trim(),
        arriveAirport: arriveAirport.trim(),
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
    }
  };

  return (
    <Modal
      open
      title={reservation ? 'Edit flight' : 'Add flight'}
      onClose={() => {
        if (!saveReservation.isPending) onClose();
      }}
      panelClassName="sm:max-w-2xl"
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
            {saveReservation.isPending ? 'Saving...' : 'Save flight'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            id="flight-name"
            label="Flight name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <TextField
          id="flight-airline"
          label="Airline"
          value={airline}
          onChange={(event) => setAirline(event.target.value)}
          required
        />
        <TextField
          id="flight-number"
          label="Flight number"
          value={flightNum}
          onChange={(event) => setFlightNum(event.target.value)}
          required
        />
        <TextField
          id="flight-depart-airport"
          label="Departure airport"
          value={departAirport}
          onChange={(event) => setDepartAirport(event.target.value)}
          required
        />
        <TextField
          id="flight-arrive-airport"
          label="Arrival airport"
          value={arriveAirport}
          onChange={(event) => setArriveAirport(event.target.value)}
          required
        />
        <TextField
          id="flight-departure"
          label="Departure time"
          type="datetime-local"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
        />
        <TextField
          id="flight-arrival"
          label="Arrival time"
          type="datetime-local"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          required
        />
        <TextField
          id="flight-confirmation"
          label="Confirmation number"
          value={confirmationNumber}
          onChange={(event) => setConfirmationNumber(event.target.value)}
        />
        <TextField
          id="flight-cost"
          label="Cost"
          type="number"
          min="0"
          step="0.01"
          value={cost}
          onChange={(event) => setCost(event.target.value)}
        />
        <label
          className="grid gap-2 text-sm font-medium sm:col-span-2"
          htmlFor="flight-notes"
        >
          Notes
          <textarea
            id="flight-notes"
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

export default FlightReservationForm;

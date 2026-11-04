import { Text, TextArea, TextField } from '../../../components/common';

interface Props {
  prefix: string;
  cost: string;
  confirmationNumber: string;
  notes: string;
  onCostChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

/** Groups optional booking records separately from itinerary scheduling.
 * @param props - Booking draft values, stable input prefix, and field callbacks.
 * @returns Cost, confirmation reference, and booking-only notes controls.
 */
const ReservationBookingFields = ({
  prefix,
  cost,
  confirmationNumber,
  notes,
  onCostChange,
  onConfirmationChange,
  onNotesChange,
}: Props) => (
  <section aria-label="Booking information" className="space-y-5">
    <Text color="muted">
      Keep your booking reference, total cost, and notes together. All fields on
      this step are optional.
    </Text>
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id={`${prefix}-cost`}
        data-cy={`${prefix}-cost`}
        label="Total cost"
        type="number"
        min="0"
        step="0.01"
        value={cost}
        onChange={(event) => onCostChange(event.target.value)}
      />
      <TextField
        id={`${prefix}-confirmation`}
        data-cy={`${prefix}-confirmation`}
        label="Confirmation number"
        value={confirmationNumber}
        onChange={(event) => onConfirmationChange(event.target.value)}
      />
    </div>
    <div className="space-y-2">
      <Text as="label" variant="label" htmlFor={`${prefix}-notes`}>
        Booking notes
      </Text>
      <TextArea
        id={`${prefix}-notes`}
        data-cy={`${prefix}-notes`}
        rows={4}
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        aria-describedby={`${prefix}-notes-hint`}
      />
      <Text id={`${prefix}-notes-hint`} variant="caption" color="muted">
        Saved with the reservation, not copied into itinerary event notes.
      </Text>
    </div>
  </section>
);
export default ReservationBookingFields;

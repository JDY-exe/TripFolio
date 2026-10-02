import type { Reservation } from '../../../../queries/reservations';
import { toLocalDateTimeInput } from '../reservationDateInput';

export const FlightWizardStep = {
  Route: 0,
  Booking: 1,
  Cost: 2,
  Review: 3,
} as const;

export type FlightWizardStep =
  (typeof FlightWizardStep)[keyof typeof FlightWizardStep];

export const flightWizardSteps = [
  { label: 'Route', value: FlightWizardStep.Route },
  { label: 'Booking', value: FlightWizardStep.Booking },
  { label: 'Cost', value: FlightWizardStep.Cost },
  { label: 'Review', value: FlightWizardStep.Review },
] as const;

export interface FlightDraft {
  name: string;
  airline: string;
  flightNum: string;
  departAirport: string;
  arriveAirport: string;
  startTime: string;
  endTime: string;
  confirmationNumber: string;
  notes: string;
  cost: string;
}

/**
 * Creates a browser-local flight draft from an existing reservation or blanks.
 * @param reservation - Existing flight when previewing an edit.
 * @returns Initial values for every wizard step.
 */
export const createFlightDraft = (reservation?: Reservation): FlightDraft => ({
  name: reservation?.name ?? '',
  airline: reservation?.flights?.airline ?? '',
  flightNum: reservation?.flights?.flightNum ?? '',
  departAirport: reservation?.flights?.departAirport ?? '',
  arriveAirport: reservation?.flights?.arriveAirport ?? '',
  startTime: toLocalDateTimeInput(reservation?.startTime),
  endTime: toLocalDateTimeInput(reservation?.endTime),
  confirmationNumber: reservation?.confirmationNumber ?? '',
  notes: reservation?.notes ?? '',
  cost: reservation?.cost?.toString() ?? '',
});

/**
 * Applies the flight code limits only to fields edited in this change.
 * @param changes - Draft fields supplied by an input event.
 * @returns Fields with airline and airport codes uppercased and length-limited.
 */
export const normalizeFlightChanges = (
  changes: Partial<FlightDraft>,
): Partial<FlightDraft> => ({
  ...changes,
  ...(changes.airline !== undefined
    ? { airline: changes.airline.toUpperCase().slice(0, 3) }
    : {}),
  ...(changes.flightNum !== undefined
    ? { flightNum: changes.flightNum.slice(0, 5) }
    : {}),
  ...(changes.departAirport !== undefined
    ? { departAirport: changes.departAirport.toUpperCase().slice(0, 3) }
    : {}),
  ...(changes.arriveAirport !== undefined
    ? { arriveAirport: changes.arriveAirport.toUpperCase().slice(0, 3) }
    : {}),
});

/**
 * Returns the first problem on the step the user is leaving.
 * @param step - Active step whose inputs should be checked.
 * @param draft - Current local flight values.
 * @returns A user-facing error, or null when the step is valid.
 */
export const validateFlightStep = (
  step: FlightWizardStep,
  draft: FlightDraft,
): string | null => {
  if (step === FlightWizardStep.Route) {
    if (
      ![
        draft.airline,
        draft.flightNum,
        draft.departAirport,
        draft.arriveAirport,
      ].every((value) => value.trim()) ||
      !draft.startTime ||
      !draft.endTime
    ) {
      return 'Complete the airline, flight number, airports, and both times.';
    }
    if (
      draft.airline.length > 3 ||
      draft.flightNum.length > 5 ||
      draft.departAirport.length > 3 ||
      draft.arriveAirport.length > 3
    ) {
      return 'Use up to 3 characters for airline and airport codes, and 5 for the flight number.';
    }
    const departure = new Date(draft.startTime);
    const arrival = new Date(draft.endTime);
    if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) {
      return 'Enter valid departure and arrival times.';
    }
    if (arrival < departure) return 'Arrival cannot be before departure.';
  }
  if (step === FlightWizardStep.Booking && !draft.name.trim()) {
    return 'Enter a flight name.';
  }
  if (step === FlightWizardStep.Cost && draft.cost.trim()) {
    const cost = Number(draft.cost);
    if (!Number.isFinite(cost) || cost < 0) {
      return 'Cost must be zero or more.';
    }
  }
  return null;
};

import type {
  FlightSegment,
  Reservation,
} from '../../../../queries/reservations';
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
  segments: FlightSegment[];
  confirmationNumber: string;
  notes: string;
  cost: string;
}

/** Creates an empty flight leg, optionally starting at a layover airport. */
export const createFlightSegment = (departAirport = ''): FlightSegment => ({
  flightNum: '',
  departAirport,
  departTime: '',
  arriveAirport: '',
  arriveTime: '',
});

/**
 * Creates a journey draft from a saved journey, legacy flight, or blanks.
 * @param reservation - Existing flight reservation, if editing.
 * @returns The initial draft for all wizard steps.
 */
export const createFlightDraft = (reservation?: Reservation): FlightDraft => ({
  name: reservation?.name ?? '',
  segments: reservation?.flights?.segments?.length
    ? reservation.flights.segments.map((segment) => ({ ...segment }))
    : [
        {
          flightNum: reservation?.flights?.flightNum ?? '',
          departAirport: reservation?.flights?.departAirport ?? '',
          departTime: toLocalDateTimeInput(reservation?.startTime),
          arriveAirport: reservation?.flights?.arriveAirport ?? '',
          arriveTime: toLocalDateTimeInput(reservation?.endTime),
        },
      ],
  confirmationNumber: reservation?.confirmationNumber ?? '',
  notes: reservation?.notes ?? '',
  cost: reservation?.cost?.toString() ?? '',
});

/**
 * Applies a leg edit and keeps the next leg's departure airport connected.
 * @param segments - Current ordered legs.
 * @param index - Leg being edited.
 * @param changes - New fields for that leg.
 * @returns A new segment array with normalized codes.
 */
export const updateFlightSegment = (
  segments: FlightSegment[],
  index: number,
  changes: Partial<FlightSegment>,
): FlightSegment[] => {
  const next = segments.map((segment) => ({ ...segment }));
  next[index] = {
    ...next[index],
    ...changes,
    ...(changes.flightNum !== undefined
      ? { flightNum: changes.flightNum.toUpperCase() }
      : {}),
    ...(changes.departAirport !== undefined
      ? { departAirport: changes.departAirport.toUpperCase().slice(0, 3) }
      : {}),
    ...(changes.arriveAirport !== undefined
      ? { arriveAirport: changes.arriveAirport.toUpperCase().slice(0, 3) }
      : {}),
  };
  if (changes.arriveAirport !== undefined && next[index + 1]) {
    next[index + 1].departAirport = next[index].arriveAirport;
  }
  return next;
};

/** Removes a leg and reconnects its neighbors for further editing. */
export const removeFlightSegment = (
  segments: FlightSegment[],
  index: number,
): FlightSegment[] => {
  const next = segments.filter((_, position) => position !== index);
  if (index > 0 && next[index]) {
    next[index] = {
      ...next[index],
      departAirport: next[index - 1].arriveAirport,
      departTime: '',
    };
  }
  return next;
};

/** Checks a wall-clock date/time without applying the browser's time zone. */
export const isFlightLocalTime = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(`${value}:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 16) === value
  );
};

/** Calculates a layover using two local times at the same airport. */
export const layoverMinutes = (
  arrival: string,
  departure: string,
): number | null => {
  if (!isFlightLocalTime(arrival) || !isFlightLocalTime(departure)) return null;
  const minutes =
    (Date.parse(`${departure}:00Z`) - Date.parse(`${arrival}:00Z`)) / 60_000;
  return minutes > 0 ? minutes : null;
};

/** Returns the first problem on the wizard step the user is leaving. */
export const validateFlightStep = (
  step: FlightWizardStep,
  draft: FlightDraft,
): string | null => {
  if (step === FlightWizardStep.Route) {
    for (const [index, segment] of draft.segments.entries()) {
      if (
        !segment.flightNum.trim() ||
        !segment.departAirport.trim() ||
        !segment.arriveAirport.trim() ||
        !segment.departTime ||
        !segment.arriveTime
      ) {
        return `Complete the flight number, airports, and times for leg ${index + 1}.`;
      }
      if (
        !/^[A-Z]{3}$/.test(segment.departAirport) ||
        !/^[A-Z]{3}$/.test(segment.arriveAirport)
      ) {
        return `Use three-letter airport codes for leg ${index + 1}.`;
      }
      if (segment.departAirport === segment.arriveAirport) {
        return `Choose different airports for leg ${index + 1}.`;
      }
      if (
        !isFlightLocalTime(segment.departTime) ||
        !isFlightLocalTime(segment.arriveTime)
      ) {
        return `Enter valid local dates and times for leg ${index + 1}.`;
      }
      if (index > 0) {
        const previous = draft.segments[index - 1];
        if (segment.departAirport !== previous.arriveAirport) {
          return `Leg ${index + 1} must leave from ${previous.arriveAirport}.`;
        }
        if (layoverMinutes(previous.arriveTime, segment.departTime) === null) {
          return `Leg ${index + 1} must depart after arrival at ${previous.arriveAirport}.`;
        }
      }
    }
  }
  if (step === FlightWizardStep.Booking && !draft.name.trim()) {
    return 'Enter a flight name.';
  }
  if (step === FlightWizardStep.Cost && draft.cost.trim()) {
    const cost = Number(draft.cost);
    if (!Number.isFinite(cost) || cost < 0) return 'Cost must be zero or more.';
  }
  return null;
};

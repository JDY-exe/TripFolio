import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FlightReservationForm from '../../../../../src/pages/trip/logistics/flights/FlightReservationForm';
import {
  FlightWizardStep,
  createFlightDraft,
  normalizeFlightChanges,
  validateFlightStep,
} from '../../../../../src/pages/trip/logistics/flights/flightWizard';
import { ReservationType } from '../../../../../src/queries/reservations';
import type { Reservation } from '../../../../../src/queries/reservations';

const validDraft = {
  name: 'Outbound flight',
  airline: 'SIA',
  flightNum: 'SQ618',
  departAirport: 'SIN',
  arriveAirport: 'KIX',
  startTime: '2027-04-02T08:25',
  endTime: '2027-04-02T16:10',
  confirmationNumber: '',
  notes: '',
  cost: '',
};

describe('flight wizard draft', () => {
  it('validates each step without requiring optional booking or cost fields', () => {
    expect(validateFlightStep(FlightWizardStep.Route, validDraft)).toBeNull();
    expect(validateFlightStep(FlightWizardStep.Booking, validDraft)).toBeNull();
    expect(validateFlightStep(FlightWizardStep.Cost, validDraft)).toBeNull();
    expect(validateFlightStep(FlightWizardStep.Review, validDraft)).toBeNull();
  });

  it('blocks incomplete routes and invalid timing', () => {
    expect(
      validateFlightStep(FlightWizardStep.Route, {
        ...validDraft,
        departAirport: ' ',
      }),
    ).toMatch(/Complete/);
    expect(
      validateFlightStep(FlightWizardStep.Route, {
        ...validDraft,
        endTime: '2027-04-02T07:00',
      }),
    ).toMatch(/Arrival cannot/);
    expect(
      validateFlightStep(FlightWizardStep.Route, {
        ...validDraft,
        airline: 'Airline',
      }),
    ).toMatch(/up to 3 characters/);
  });

  it('uppercases and limits edited airline and airport codes', () => {
    expect(
      normalizeFlightChanges({
        airline: 'sqab',
        flightNum: '123456',
        departAirport: 'sinfo',
        arriveAirport: 'kixx',
        name: 'Outbound flight',
      }),
    ).toEqual({
      airline: 'SQA',
      flightNum: '12345',
      departAirport: 'SIN',
      arriveAirport: 'KIX',
      name: 'Outbound flight',
    });
  });

  it('requires a flight name and rejects negative cost', () => {
    expect(
      validateFlightStep(FlightWizardStep.Booking, { ...validDraft, name: '' }),
    ).toMatch(/flight name/);
    expect(
      validateFlightStep(FlightWizardStep.Cost, { ...validDraft, cost: '-1' }),
    ).toMatch(/zero or more/);
  });

  it('prefills edit drafts and renders a clearly non-saving preview', () => {
    const reservation: Reservation = {
      _id: 'flight-1',
      type: ReservationType.Flights,
      name: 'Return flight',
      startTime: '2027-04-02T00:25:00Z',
      endTime: '2027-04-02T07:10:00Z',
      flights: {
        airline: 'Singapore Airlines',
        flightNum: 'SQ 618',
        departAirport: 'SIN',
        arriveAirport: 'KIX',
      },
    };
    const draft = createFlightDraft(reservation);
    expect(draft.flightNum).toBe('SQ 618');
    expect(draft.departAirport).toBe('SIN');
    expect(draft.startTime).toMatch(/^2027-04-0[12]T\d{2}:25$/);

    const markup = renderToStaticMarkup(
      createElement(FlightReservationForm, {
        reservation,
        onClose: () => undefined,
      }),
    );
    expect(markup).toContain('Your changes will not be saved');
    expect(markup).toContain('Close preview');
    expect(markup).not.toContain('Save flight');
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    expect(
      validateFlightStep(FlightWizardStep.Route, {
        ...validDraft,
        flightNum: '',
      }),
    ).toBeNull();
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
  });

  it('uppercases flight numbers and limits edited airport codes', () => {
    expect(
      normalizeFlightChanges({
        flightNum: 'sq123456',
        departAirport: 'sinfo',
        arriveAirport: 'kixx',
        name: 'Outbound flight',
      }),
    ).toEqual({
      flightNum: 'SQ123456',
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

  it('prefills edit drafts and renders the flight form', () => {
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
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(FlightReservationForm, {
          tripId: 'trip-1',
          reservation,
          onClose: () => undefined,
        }),
      ),
    );
    expect(markup).toContain('Edit your flight information.');
    expect(markup).toContain('Cancel');
    expect(markup).toContain('Airline code and flight number');
  });
});

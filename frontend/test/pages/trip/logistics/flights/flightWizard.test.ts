import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FlightJourneyTimeline from '../../../../../src/pages/trip/logistics/flights/FlightJourneyTimeline';
import FlightReservationForm from '../../../../../src/pages/trip/logistics/flights/FlightReservationForm';
import FlightsSection from '../../../../../src/pages/trip/logistics/flights/FlightsSection';
import {
  FlightWizardStep,
  createFlightDraft,
  layoverMinutes,
  removeFlightSegment,
  updateFlightSegment,
  validateFlightStep,
} from '../../../../../src/pages/trip/logistics/flights/flightWizard';
import {
  ReservationType,
  reservationsQueryKey,
} from '../../../../../src/queries/reservations';
import type { Reservation } from '../../../../../src/queries/reservations';

const validDraft = {
  name: 'Outbound flight',
  segments: [
    {
      flightNum: 'SQ618',
      departAirport: 'SIN',
      departTime: '2027-04-02T08:25',
      arriveAirport: 'KIX',
      arriveTime: '2027-04-02T16:10',
    },
  ],
  confirmationNumber: '',
  notes: '',
  cost: '',
};

const connectedDraft = {
  ...validDraft,
  segments: [
    validDraft.segments[0],
    {
      flightNum: 'JL123',
      departAirport: 'KIX',
      departTime: '2027-04-02T19:10',
      arriveAirport: 'SFO',
      arriveTime: '2027-04-02T12:00',
    },
  ],
};

describe('flight journey wizard', () => {
  it('accepts local airport times and calculates an overnight layover', () => {
    expect(
      validateFlightStep(FlightWizardStep.Route, connectedDraft),
    ).toBeNull();
    expect(
      validateFlightStep(FlightWizardStep.Booking, connectedDraft),
    ).toBeNull();
    expect(
      validateFlightStep(FlightWizardStep.Cost, connectedDraft),
    ).toBeNull();
    expect(layoverMinutes('2027-04-02T23:30', '2027-04-03T02:30')).toBe(180);
  });

  it('rejects missing leg details and a departure before layover arrival', () => {
    expect(
      validateFlightStep(FlightWizardStep.Route, {
        ...validDraft,
        segments: [{ ...validDraft.segments[0], flightNum: '' }],
      }),
    ).toMatch(/leg 1/);
    expect(
      validateFlightStep(FlightWizardStep.Route, {
        ...connectedDraft,
        segments: [
          connectedDraft.segments[0],
          { ...connectedDraft.segments[1], departTime: '2027-04-02T15:00' },
        ],
      }),
    ).toMatch(/depart after arrival/);
    expect(
      validateFlightStep(FlightWizardStep.Route, {
        ...validDraft,
        segments: [{ ...validDraft.segments[0], departAirport: 'SI' }],
      }),
    ).toMatch(/three-letter/);
  });

  it('keeps adjacent airports connected during edits and removal', () => {
    const changed = updateFlightSegment(connectedDraft.segments, 0, {
      arriveAirport: 'nrt',
    });
    expect(changed[0].arriveAirport).toBe('NRT');
    expect(changed[1].departAirport).toBe('NRT');
    expect(removeFlightSegment(changed, 1)).toHaveLength(1);
  });

  it('prefills existing journeys and legacy flights', () => {
    const reservation: Reservation = {
      _id: 'flight-1',
      type: ReservationType.Flights,
      name: 'Return flight',
      startTime: '2027-04-02T00:25:00Z',
      endTime: '2027-04-02T07:10:00Z',
      flights: {
        flightNum: 'SQ 618',
        departAirport: 'SIN',
        arriveAirport: 'KIX',
      },
    };
    expect(createFlightDraft(reservation).segments[0].flightNum).toBe('SQ 618');
    expect(
      createFlightDraft({
        ...reservation,
        flights: { ...reservation.flights!, segments: connectedDraft.segments },
      }).segments,
    ).toEqual(connectedDraft.segments);

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
    expect(markup).toContain('Add layover / next flight');
    expect(markup).toContain('Leg 1');
  });

  it('shows every leg and layover in the review timeline', () => {
    const markup = renderToStaticMarkup(
      createElement(FlightJourneyTimeline, {
        segments: connectedDraft.segments,
      }),
    );
    expect(markup).toContain('Leg 1');
    expect(markup).toContain('Leg 2');
    expect(markup).toContain('Layover in KIX');
    expect(markup).toContain('3h');
  });

  it('shows saved journeys and older flights as separate cards', () => {
    const legacy: Reservation = {
      _id: 'legacy',
      type: ReservationType.Flights,
      name: 'Older flight',
      startTime: '2027-04-01T08:00:00Z',
      endTime: '2027-04-01T10:00:00Z',
      flights: {
        flightNum: 'AB123',
        departAirport: 'SIN',
        arriveAirport: 'KIX',
      },
    };
    const journey: Reservation = {
      ...legacy,
      _id: 'journey',
      name: 'Connecting journey',
      flights: { ...legacy.flights!, segments: connectedDraft.segments },
    };
    const client = new QueryClient();
    client.setQueryData(
      reservationsQueryKey('trip-1', ReservationType.Flights),
      [legacy, journey],
    );
    const markup = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(FlightsSection, {
          tripId: 'trip-1',
          onAdd: () => undefined,
          onEdit: () => undefined,
          onDelete: () => undefined,
        }),
      ),
    );
    expect(markup).toContain('Older flight');
    expect(markup).toContain('Connecting journey');
    expect(markup).toContain('Layover in KIX');
  });
});

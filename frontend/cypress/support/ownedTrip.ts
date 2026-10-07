import featureFixture from '../fixtures/owned-features.json';
import { visitAsUser } from './auth';

interface TripMocks {
  events?: () => object[];
  reservations?: (path: string) => object[];
}

/**
 * Opens an owned trip with isolated API data for page interaction tests.
 * @param section - Trip navigation section to select after loading.
 * @param mocks - Optional mutable collections returned by trip APIs.
 * @returns Nothing; Cypress queues the route mocks and browser actions.
 */
export const visitOwnedTrip = (section?: string, mocks: TripMocks = {}) => {
  cy.intercept(
    { method: 'GET', pathname: '/trip' },
    {
      body: [featureFixture.trip],
    },
  );
  cy.intercept(
    { method: 'GET', pathname: '/itinerary' },
    {
      body: featureFixture.itinerary,
    },
  );
  cy.intercept({ method: 'GET', pathname: '/event' }, (request) => {
    request.reply({ body: mocks.events?.() ?? [] });
  });
  cy.intercept({ method: 'GET', pathname: '/logistics/*' }, (request) => {
    const path = new URL(request.url).pathname;
    request.reply({ body: { reservations: mocks.reservations?.(path) ?? [] } });
  });
  cy.intercept(
    {
      method: 'GET',
      hostname: 'localhost',
      pathname: `/trip/${featureFixture.trip._id}`,
    },
    { body: featureFixture.trip },
  );
  visitAsUser(`/trip/${featureFixture.trip._id}`);
  if (section) cy.get(`[data-cy="nav-${section.toLowerCase()}"]`).click();
};

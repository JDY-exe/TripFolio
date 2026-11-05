import fixture from '../fixtures/itinerary-map.json';
import { visitOwnedTrip } from '../support/ownedTrip';

describe('Memory Atlas event pins', () => {
  beforeEach(() => {
    cy.viewport(1280, 1000);
    cy.intercept('GET', 'https://tiles.openfreemap.org/styles/*', {
      body: fixture.style,
    });
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos' },
      {
        body: { photos: [], nextCursor: null },
      },
    );
    cy.intercept(
      { method: 'GET', pathname: '/event/*/location' },
      (request) => {
        const id = new URL(request.url).pathname.split(
          '/',
        )[2] as keyof typeof fixture.locations;
        request.reply({ body: { location: fixture.locations[id] ?? null } });
      },
    );
  });

  it('shows events without photos and identifies both map layers', () => {
    visitOwnedTrip('Album', { events: () => fixture.events });
    cy.get('[data-cy="atlas-legend"]')
      .should('contain.text', 'Event pins')
      .and('contain.text', 'Photo stacks');
    cy.get('[data-cy="atlas-event-pin"]').should(
      'have.length',
      fixture.events.length,
    );
    cy.get('[data-cy="atlas-event-pin"][aria-label="Event: Beach walk"]')
      .should('be.visible')
      .focus()
      .find('.atlas-event-label')
      .should('be.visible')
      .and('have.text', 'Beach walk');
    cy.get('[data-cy="atlas-stack"]').should('not.exist');
    cy.screenshot('atlas-event-pins-desktop', { capture: 'viewport' });
    cy.viewport(390, 844);
    cy.get('[data-cy="album-tab-map"]').click();
    cy.get(
      '[data-cy="atlas-event-pin"][aria-label="Event: Beach walk"]',
    ).should(($pin) => {
      const pin = $pin[0].getBoundingClientRect();
      const canvas = $pin[0]
        .closest('[data-cy="album-map"]')!
        .querySelector('[data-cy="atlas-canvas"]')!
        .getBoundingClientRect();
      expect(pin.left).to.be.greaterThan(canvas.left);
      expect(pin.right).to.be.lessThan(canvas.right);
      expect(pin.top).to.be.greaterThan(canvas.top);
      expect(pin.bottom).to.be.lessThan(canvas.bottom);
    });
    cy.screenshot('atlas-event-pins-mobile', { capture: 'viewport' });
  });
});

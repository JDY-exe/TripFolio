import fixture from '../fixtures/trip-reading';
import { visitAsUser } from '../support/auth';

/** Stubs reading APIs independently from the planning editor.
 * @returns Nothing; queues the reading-view API intercepts.
 */
const mockReading = () => {
  cy.intercept(
    { method: 'GET', pathname: `/trip/${fixture.trip._id}` },
    { body: fixture.trip },
  );
  cy.intercept(
    { method: 'GET', pathname: '/trip/archived' },
    { body: [fixture.trip] },
  );
  cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [fixture.trip] });
  cy.intercept(
    { method: 'GET', pathname: '/itinerary' },
    { body: fixture.itinerary },
  );
  cy.intercept(
    { method: 'GET', pathname: '/event' },
    { body: [fixture.event] },
  );
  cy.intercept(
    { method: 'GET', pathname: `/itinerary/${fixture.trip._id}/notes` },
    { body: 'null', headers: { 'content-type': 'application/json' } },
  );
  cy.intercept(
    { method: 'GET', pathname: '/event/*/photo' },
    { body: { photo: null } },
  );
  cy.intercept('GET', 'https://tiles.openfreemap.org/styles/*', {
    body: fixture.mapStyle,
  });
  cy.intercept(
    { method: 'GET', pathname: `/api/itineraries/${fixture.trip._id}` },
    { body: fixture.publicDetails },
  );
};

/** Forces link sharing through a predictable clipboard implementation.
 * @returns Nothing; installs share and clipboard stubs before navigation.
 */
const mockClipboard = () => {
  cy.on('window:before:load', (win) => {
    Object.defineProperty(win.navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(win.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: cy.stub().as('copyLink').resolves() },
    });
  });
};

describe('trip reading layout', () => {
  beforeEach(mockReading);

  it('leads with the story and metadata, keeping a prominent map on the right', () => {
    cy.viewport(1280, 1000);
    visitAsUser(`/trip/archived/${fixture.trip._id}`);
    cy.get('[data-cy="trip-section-itinerary"]').should(
      'have.text',
      fixture.trip.name,
    );
    cy.get('[data-cy="trip-reading-metadata"]')
      .should('contain.text', '2 travelers')
      .find('[data-cy="trip-archived-status"]')
      .should('have.text', 'Archived');
    cy.get('[data-cy="trip-reading-description"]').should(
      'have.text',
      fixture.itinerary.description,
    );
    cy.get('[data-cy="trip-overview"]').should('not.exist');
    cy.get('[data-cy="personal-notes-toggle"]')
      .parent()
      .should('not.have.attr', 'open');
    cy.get('[data-cy="day-toggle-2030-04-02"]').should('not.exist');
    cy.get('[data-cy="itinerary-map-preview"]').should(
      'have.css',
      'height',
      '448px',
    );
    cy.get('[data-cy="reading-trip-map"]').then(($map) => {
      const map = $map[0].getBoundingClientRect();
      cy.get('[data-cy="trip-reading-description"]').then(($description) => {
        expect(map.left).to.be.greaterThan(
          $description[0].getBoundingClientRect().right,
        );
      });
    });
    cy.get(`[data-cy="event-card-${fixture.event._id}"]`).should('be.visible');
    cy.get(
      `[data-cy="itinerary-map-preview"] [data-cy="map-pin-${fixture.event._id}"]`,
    ).should(($pin) => {
      const pin = $pin[0].getBoundingClientRect();
      const map = $pin[0]
        .closest('[data-cy="itinerary-map-preview"]')!
        .getBoundingClientRect();
      expect(
        Math.abs(pin.left + pin.width / 2 - (map.left + map.width / 2)),
      ).to.be.lessThan(10);
      expect(
        Math.abs(pin.top + pin.height / 2 - (map.top + map.height / 2)),
      ).to.be.lessThan(10);
    });
    cy.screenshot('reading-trip-desktop', { capture: 'viewport' });
  });

  it('omits the map and all location requests on mobile, including after resizing', () => {
    cy.viewport(390, 844);
    cy.intercept(
      { method: 'GET', pathname: '/event' },
      { body: [fixture.legacyEvent] },
    );
    cy.intercept(
      { method: 'GET', pathname: '/event/*/location' },
      { body: { location: fixture.location } },
    ).as('locations');
    visitAsUser(`/trip/archived/${fixture.trip._id}`);
    cy.get('[data-cy="trip-reading-description"]').should('be.visible');
    cy.get(`[data-cy="event-card-${fixture.event._id}"]`).should('exist');
    cy.get('[data-cy="itinerary-map"]').should('not.exist');
    cy.get('[data-cy="expand-itinerary-map"]').should('not.exist');
    cy.get('@locations.all').should('have.length', 0);
    cy.screenshot('reading-trip-mobile', { capture: 'viewport' });
    cy.viewport(1280, 900);
    cy.get('[data-cy="itinerary-map"]').should('exist');
    cy.viewport(390, 844);
    cy.get('[data-cy="itinerary-map"]').should('not.exist');
  });

  for (const role of ['owner', 'editor', 'viewer'] as const) {
    it(`lets a public archived trip ${role} share its public link without granting access`, () => {
      mockClipboard();
      cy.intercept(
        { method: 'GET', pathname: `/trip/${fixture.trip._id}` },
        { body: { ...fixture.trip, isPublic: true, currentUserRole: role } },
      );
      cy.intercept('POST', '**/trip/*/share-archive', { statusCode: 403 }).as(
        'grantAccess',
      );
      visitAsUser(`/trip/archived/${fixture.trip._id}`, role);
      cy.get('[data-cy="share-public-trip"]').click();
      cy.get('@copyLink').should(
        'have.been.calledOnceWith',
        `${window.location.origin}/public-itinerary/${fixture.trip._id}`,
      );
      cy.get('@grantAccess.all').should('have.length', 0);
      cy.get('[data-cy="share-archived-trip-open"]').should('not.exist');
    });
  }

  it('lets a non-member share a public itinerary and keeps it read-only', () => {
    mockClipboard();
    visitAsUser(`/public-itinerary/${fixture.trip._id}`, 'viewer');
    cy.get('[data-cy="share-public-trip"]').click();
    cy.get('@copyLink').should('have.been.calledOnce');
    cy.get('[data-cy="trip-reading-metadata"]').should(
      'contain.text',
      `By ${fixture.user.username}`,
    );
    cy.get('[data-cy="description-edit"]').should('not.exist');
    cy.get('[data-cy^="add-event-"]').should('not.exist');
    cy.get('[data-cy="personal-notes-toggle"]').should('not.exist');
  });

  it('offers a selectable link when copying fails', () => {
    cy.on('window:before:load', (win) => {
      Object.defineProperty(win.navigator, 'share', {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(win.navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: cy.stub().rejects(new Error('Clipboard unavailable')),
        },
      });
    });
    visitAsUser(`/public-itinerary/${fixture.trip._id}`, 'viewer');
    cy.get('[data-cy="share-public-trip"]').click();
    cy.get('[data-cy="public-trip-link"]')
      .should(
        'have.value',
        `${window.location.origin}/public-itinerary/${fixture.trip._id}`,
      )
      .and('have.attr', 'readonly');
  });

  it('shows native sharing and treats cancellation as cancellation', () => {
    cy.on('window:before:load', (win) => {
      Object.defineProperty(win.navigator, 'share', {
        configurable: true,
        value: cy
          .stub()
          .as('nativeShare')
          .rejects(new DOMException('Cancelled', 'AbortError')),
      });
      Object.defineProperty(win.navigator, 'clipboard', {
        configurable: true,
        value: { writeText: cy.stub().as('copyLink').resolves() },
      });
    });
    visitAsUser(`/public-itinerary/${fixture.trip._id}`, 'viewer');
    cy.get('[data-cy="share-public-trip"]').click();
    cy.get('@nativeShare').should('have.been.calledOnce');
    cy.get('@copyLink').should('not.have.been.called');
    cy.get('[data-cy="public-trip-link"]').should('not.exist');
  });

  it('omits empty descriptions and shows one empty timeline message', () => {
    cy.intercept(
      { method: 'GET', pathname: `/api/itineraries/${fixture.trip._id}` },
      {
        body: {
          ...fixture.publicDetails,
          events: [],
          itinerary: { ...fixture.itinerary, description: '' },
        },
      },
    );
    visitAsUser(`/public-itinerary/${fixture.trip._id}`);
    cy.get('[data-cy="trip-reading-description"]').should('not.exist');
    cy.contains('No itinerary events.').should('be.visible');
    cy.get('[data-cy^="day-toggle-"]').should('not.exist');
  });

  it('wraps long titles on mobile without horizontal scrolling', () => {
    cy.viewport(390, 844);
    cy.intercept(
      { method: 'GET', pathname: `/api/itineraries/${fixture.trip._id}` },
      {
        body: {
          ...fixture.publicDetails,
          trip: { ...fixture.trip, name: fixture.longTitle },
        },
      },
    );
    visitAsUser(`/public-itinerary/${fixture.trip._id}`);
    cy.get('[data-cy="trip-section-itinerary"]').should(
      'have.text',
      fixture.longTitle,
    );
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.equal(
        document.documentElement.clientWidth,
      );
    });
  });
});

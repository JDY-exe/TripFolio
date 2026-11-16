import archiveFixture from '../fixtures/archived-trip';
import tripsFixture from '../fixtures/my-trips';
import invitations from '../fixtures/trip-invitations.json';
import featureFixture from '../fixtures/owned-features.json';
import { visitAsUser } from '../support/auth';

describe('My Trips', () => {
  beforeEach(() => {
    cy.intercept({ method: 'GET', pathname: '/trip/archived' }, { body: [] });
    cy.intercept('GET', '**/trip/invitations', { body: { invites: [] } });
  });

  it('appends archived trips with grayscale artwork and removes their navigation tab', () => {
    cy.intercept(
      { method: 'GET', pathname: '/trip' },
      { body: [featureFixture.trip] },
    );
    cy.intercept(
      { method: 'GET', pathname: '/trip/archived' },
      {
        body: [tripsFixture.archivedTrip, tripsFixture.photographedArchive],
      },
    );
    cy.intercept('GET', '**/trip/archived-photo/profile_picture*', {
      headers: { 'content-type': 'image/png' },
      fixture: 'avatar.png',
    });
    cy.viewport(1280, 1000);
    visitAsUser('/my-trips');
    cy.get('[data-cy="my-trips-title"]').should('have.text', 'My Trips');
    cy.get('[data-cy^="trip-card-container-"]')
      .should('have.length', 3)
      .first()
      .should(
        'have.attr',
        'data-cy',
        `trip-card-container-${featureFixture.trip._id}`,
      );
    cy.get('[data-cy="trip-card-container-archived-trip"]').within(() => {
      cy.get('[data-cy="trip-status"]').should('have.text', 'archived');
      cy.get('[data-cy="trip-card-artwork"]').should(
        'have.css',
        'filter',
        'grayscale(1)',
      );
      cy.get('[data-cy="shared-with-you-badge"]').should('be.visible');
      cy.get('[data-cy="trip-card-archived-trip"]').should(
        'have.attr',
        'href',
        '/trip/archived/archived-trip',
      );
    });
    cy.get(
      `[data-cy="trip-card-container-${featureFixture.trip._id}"] [data-cy="trip-card-artwork"]`,
    ).should('have.css', 'filter', 'none');
    cy.get('[data-cy="nav-archived-trips"]').should('not.exist');
    cy.get(
      '[data-cy="trip-card-container-archived-photo"] [data-cy="trip-card-artwork"]',
    )
      .should('have.css', 'filter', 'grayscale(1)')
      .find('img')
      .should('be.visible');
    cy.screenshot('combined-trips-desktop', { capture: 'fullPage' });
    cy.viewport(390, 844);
    cy.get('[data-cy="trip-card-container-archived-photo"]').scrollIntoView();
    cy.screenshot('combined-trips-mobile', { capture: 'fullPage' });
  });

  it('shows archived trips when there are no current trips and redirects old bookmarks', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    cy.intercept(
      { method: 'GET', pathname: '/trip/archived' },
      { body: [archiveFixture.trip] },
    );
    visitAsUser('/archived-trips');
    cy.location('pathname').should('eq', '/my-trips');
    cy.get(`[data-cy="trip-card-${archiveFixture.trip._id}"]`).should('exist');
    cy.get('[data-cy="empty-trips"]').should('not.exist');
  });

  it('does not show the empty state while archives are loading', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    cy.intercept(
      { method: 'GET', pathname: '/trip/archived' },
      { body: [tripsFixture.archivedTrip], delay: 1200 },
    ).as('archives');
    visitAsUser('/my-trips');
    cy.contains('Loading archived trips...').should('be.visible');
    cy.get('[data-cy="empty-trips"]').should('not.exist');
    cy.wait('@archives');
    cy.get('[data-cy="trip-card-archived-trip"]').should('exist');
    cy.get('[data-cy="empty-trips"]').should('not.exist');
  });

  it('keeps archived trips visible when current trips fail', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { statusCode: 500 });
    cy.intercept(
      { method: 'GET', pathname: '/trip/archived' },
      { body: [tripsFixture.archivedTrip] },
    );
    visitAsUser('/my-trips');
    cy.get('[data-cy="trip-card-archived-trip"]').should('exist');
    cy.get('[data-cy="retry-current-trips"]', { timeout: 15000 }).should(
      'be.visible',
    );
    cy.get('[data-cy="empty-trips"]').should('not.exist');
  });

  it('keeps current trips visible when archives fail and retries the archive query', () => {
    cy.intercept(
      { method: 'GET', pathname: '/trip' },
      { body: [featureFixture.trip] },
    );
    cy.intercept(
      { method: 'GET', pathname: '/trip/archived' },
      { statusCode: 500 },
    );
    visitAsUser('/my-trips');
    cy.get(`[data-cy="trip-card-${featureFixture.trip._id}"]`).should('exist');
    cy.get('[data-cy="retry-archived-trips"]', { timeout: 15000 }).should(
      'be.visible',
    );
    cy.intercept({ method: 'GET', pathname: '/trip/archived' }, { body: [] });
    cy.get('[data-cy="retry-archived-trips"]').click().should('not.exist');
    cy.get('[data-cy="empty-trips"]').should('not.exist');
  });

  for (const status of ['accepted', 'declined']) {
    it(`responds to invitations with ${status}`, () => {
      cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
      cy.intercept('GET', '**/trip/invitations', {
        body: { invites: invitations },
      });
      cy.intercept('PATCH', '**/trip/invitations/*', (request) => {
        expect(request.body.status).to.equal(status);
        request.reply({ invitation: { status } });
      }).as('respond');
      cy.intercept('GET', '**/trip/*/profile_picture*', {
        headers: { 'content-type': 'image/svg+xml' },
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="teal"/></svg>',
      });
      visitAsUser('/my-trips');
      cy.get('[data-cy="trip-invitations"]').click();
      cy.contains(invitations[0].trip.name).should('be.visible');
      cy.get('[data-cy="invitation-trip-picture"]').should('be.visible');
      cy.get('[data-cy="invitation-owner-picture"]').should(
        'have.attr',
        'src',
        invitations[0].trip.owner.profile_picture,
      );
      cy.contains(invitations[0].trip.owner.username).should('be.visible');
      cy.intercept('GET', '**/trip/invitations', {
        body: { invites: [] },
      });
      cy.get(
        status === 'accepted'
          ? '[data-cy="accept-invitation"]'
          : '[data-cy="decline-invitation"]',
      ).click();
      cy.wait('@respond');
      cy.contains('No pending invitations.').should('be.visible');
    });
  }

  it('shows an empty state', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    visitAsUser('/my-trips');
    cy.contains('No trips found. Create one to get started!').should('exist');
  });

  it('opens a populated trip card', () => {
    cy.intercept(
      { method: 'GET', pathname: '/trip' },
      { body: [featureFixture.trip] },
    );
    cy.intercept(
      { method: 'GET', pathname: '/itinerary' },
      {
        body: featureFixture.itinerary,
      },
    );
    cy.intercept({ method: 'GET', pathname: '/event' }, { body: [] });
    visitAsUser('/my-trips');
    cy.get(`[data-cy="trip-card-container-${featureFixture.trip._id}"]`)
      .find('[data-cy="trip-card-title"]')
      .should('have.text', featureFixture.trip.name);
    cy.get(`[data-cy="trip-card-${featureFixture.trip._id}"]`).click();
    cy.location('pathname').should('eq', `/trip/${featureFixture.trip._id}`);
  });

  it('shows the unique number of trip travelers on the card', () => {
    const trip = {
      ...featureFixture.trip,
      ownerId: 'owner-id',
      users: ['owner-id', 'member-id', 'member-id'],
    };
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [trip] });
    visitAsUser('/my-trips');

    cy.get(`[data-cy="trip-card-container-${trip._id}"]`).should(
      'contain.text',
      '2 Travelers',
    );
  });

  it('rejects reversed dates before creating a trip', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    cy.intercept(
      { method: 'POST', pathname: '/trip' },
      {
        statusCode: 500,
      },
    ).as('createTrip');
    visitAsUser('/my-trips');
    cy.get('[data-cy="new-trip"]').click();
    cy.get('[data-cy="trip-name"]').type('Backwards trip');
    cy.get('[data-cy="trip-start-date"]').type('2030-04-05');
    cy.get('[data-cy="trip-end-date"]').type('2030-04-01');
    cy.get('[data-cy="create-trip"]').click();
    cy.get('[data-cy="create-trip-error"]').should(
      'contain.text',
      'Ending date must come after starting date.',
    );
    cy.get('@createTrip.all').should('have.length', 0);
  });

  it('keeps the form open when the create request fails', () => {
    cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [] });
    cy.intercept(
      { method: 'POST', pathname: '/trip' },
      {
        statusCode: 500,
        body: { message: 'Server error' },
      },
    ).as('createTrip');
    visitAsUser('/my-trips');
    cy.get('[data-cy="new-trip"]').click();
    cy.get('[data-cy="trip-name"]').type('Weekend trip');
    cy.get('[data-cy="trip-start-date"]').type('2030-04-01');
    cy.get('[data-cy="trip-end-date"]').type('2030-04-05');
    cy.get('[data-cy="create-trip"]').click();

    cy.wait('@createTrip');
    cy.get('[data-cy="create-trip-error"]').should(
      'contain.text',
      'Failed to create trip. Please try again.',
    );
    cy.get('[data-cy="trip-name"]').should('have.value', 'Weekend trip');
  });
});

import { settingsFixture as fixture } from '../fixtures/trip-settings';
import { visitAsUser } from '../support/auth';

/** Loads settings with isolated trip and itinerary data.
 * @returns Nothing; Cypress queues mock endpoints and authenticated navigation.
 */
const openSettings = () => {
  cy.intercept({ method: 'GET', pathname: '/trip' }, { body: [fixture.trip] });
  cy.intercept(
    {
      method: 'GET',
      hostname: 'localhost',
      pathname: `/trip/${fixture.trip._id}`,
    },
    { body: fixture.trip },
  );
  cy.intercept(
    { method: 'GET', pathname: '/itinerary' },
    { body: fixture.itinerary },
  ).as('itinerary');
  visitAsUser(`/trip/${fixture.trip._id}?section=settings`);
  cy.get('[data-cy="trip-settings-title"]').should('be.visible');
};

describe('trip settings', () => {
  it('keeps grouped settings usable on desktop and mobile', () => {
    cy.viewport(1280, 1000);
    openSettings();
    cy.get('[data-cy="trip-members"]').should('contain.text', 'Jordan');
    cy.get('[data-cy="nav-settings"]')
      .closest('nav')
      .invoke('css', 'visibility', 'hidden');
    cy.screenshot('trip-settings-desktop', { capture: 'fullPage' });
    cy.viewport(390, 844);
    cy.screenshot('trip-settings-mobile', { capture: 'fullPage' });
    cy.get('[data-cy="nav-settings"]')
      .closest('nav')
      .invoke('css', 'visibility', 'visible');
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.equal(
        document.documentElement.clientWidth,
      );
    });
    cy.get('[data-cy="description-edit"]').click();
    cy.get('[data-cy="description-input"]').should('be.visible');
    cy.get('[data-cy="description-cancel"]').click();
  });

  it('preserves a failed description draft and lets the user cancel it', () => {
    openSettings();
    cy.intercept('PATCH', `**/itinerary/${fixture.itinerary._id}`, {
      statusCode: 500,
      body: { message: fixture.saveError },
    }).as('save');
    cy.get('[data-cy="description-edit"]').click();
    cy.wait('@itinerary');
    cy.get('[data-cy="description-input"]').clear().type(fixture.draft);
    cy.get('[data-cy="description-save"]').click();
    cy.wait('@save');
    cy.get('[data-cy="toast"]').should('contain.text', fixture.saveError);
    cy.get('[data-cy="description-input"]').should('have.value', fixture.draft);
    cy.get('[data-cy="description-cancel"]').click();
    cy.get('[data-cy="description-edit"]').click();
    cy.get('[data-cy="description-input"]').should(
      'have.value',
      fixture.itinerary.description,
    );
  });

  it('maps the positive profile visibility switch to the hidden-user preference', () => {
    openSettings();
    cy.intercept('PATCH', '**/trip/hideUser', {
      body: { hidden: true, version: 1 },
    }).as('hideProfile');
    cy.get('[data-cy="trip-profile-visibility"]')
      .should('be.checked')
      .uncheck();
    cy.wait('@hideProfile')
      .its('request.body.changes.hiddenUsers')
      .should('deep.equal', [fixture.trip.ownerId]);
    cy.get('[data-cy="trip-profile-visibility"]').should('not.be.checked');
    cy.intercept('PATCH', '**/trip/hideUser', {
      body: { hidden: false, version: 2 },
    }).as('showProfile');
    cy.get('[data-cy="trip-profile-visibility"]').check();
    cy.wait('@showProfile')
      .its('request.body.changes.hiddenUsers')
      .should('deep.equal', []);
    cy.get('[data-cy="trip-profile-visibility"]').should('be.checked');
  });
});

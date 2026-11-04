import { atlasPhotos } from '../fixtures/memory-atlas';
import mapFixture from '../fixtures/itinerary-map.json';
import { visitOwnedTrip } from '../support/ownedTrip';

describe('memory atlas', () => {
  beforeEach(() => {
    cy.viewport(1440, 1000);
    cy.intercept('GET', 'https://tiles.openfreemap.org/styles/*', {
      body: mapFixture.style,
    });
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos' },
      { body: { photos: atlasPhotos, nextCursor: null } },
    );
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
    );
  });

  it('filters the existing gallery, scopes its viewer and clears the filter without moving the map', () => {
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-photo"]').should('have.length', 4);
    cy.get('[data-cy="atlas-stack"]').should('have.length', 2);
    cy.get('[data-cy="atlas-stack"][aria-label*="2 photos"]')
      .should(($stack) => {
        const map = $stack[0].closest('[data-cy="atlas-canvas"]')!;
        expect(
          $stack[0].getBoundingClientRect().top,
          `map top ${map.getBoundingClientRect().top}, scroll ${map.scrollTop}`,
        ).to.be.at.least(map.getBoundingClientRect().top);
      })
      .click({ scrollBehavior: false });
    cy.get('[data-cy="atlas-spread"]').should('not.exist');
    cy.get('[data-cy="album-filter"]')
      .should('contain', 'Photos around here')
      .and('be.focused');
    cy.get('[data-cy="album-photo"]').should('have.length', 2).first().click();
    cy.get('[data-cy="album-photo-viewer"]').should('be.visible');
    cy.contains('button', 'Next photo').click().should('be.disabled');
    cy.get('[data-cy="modal-close"]').click();
    cy.get('[data-cy="album-photo"]').first().should('be.focused');
    cy.get('[data-cy="atlas-stack"][aria-label*="2 photos"]').should(
      'have.attr',
      'aria-pressed',
      'true',
    );
    cy.get('[data-cy="atlas-canvas"]').should(($map) => {
      expect($map[0].scrollTop).to.equal(0);
      expect($map[0].scrollLeft).to.equal(0);
    });
    cy.get('[data-cy="atlas-stack"][aria-label*="2 photos"]').should(
      ($stack) => {
        const map = $stack[0].closest('[data-cy="atlas-canvas"]')!;
        expect($stack[0].getBoundingClientRect().top).to.be.at.least(
          map.getBoundingClientRect().top,
        );
      },
    );
    cy.screenshot('memory-atlas-filtered-desktop', { capture: 'viewport' });
    cy.get('[data-cy="album-clear-filter"]').click();
    cy.get('[data-cy="album-filter"]').should('not.exist');
    cy.get('[data-cy="album-photo"]').should('have.length', 4);
    cy.get('[data-cy="atlas-stack"][aria-pressed="true"]').should('not.exist');
  });

  it('switches from the mobile map to the shared grid for placed and unplaced photos', () => {
    cy.viewport(390, 844);
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-tab-map"]').click();
    cy.get('[data-cy="atlas-stack"][aria-label*="2 photos"]').click();
    cy.get('[data-cy="album-tab-photos"]').should(
      'have.attr',
      'aria-selected',
      'true',
    );
    cy.get('[data-cy="album-photo"]').should('have.length', 2);
    cy.get('[data-cy="album-tab-map"]').click();
    cy.get('[data-cy="atlas-unplaced"]')
      .should('have.text', 'Not placed yet')
      .click();
    cy.get('[data-cy="album-filter"]').should('contain', 'Not placed yet');
    cy.get('[data-cy="album-photo"]').should('have.length', 1).click();
    cy.contains('button', 'Next photo').should('be.disabled');
    cy.get('[data-cy="modal-close"]').click();
    cy.screenshot('memory-atlas-filtered-mobile', { capture: 'viewport' });
    cy.get('[data-cy="album-clear-filter"]').click();
    cy.get('[data-cy="album-photo"]').should('have.length', 4);
  });

  it('sections by capture day, not upload day, and keeps undated photos separate', () => {
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-date-group"]').should('have.length', 3);
    cy.get('[data-cy="album-date-group"]')
      .eq(0)
      .should('have.attr', 'data-date', '2026-05-12');
    cy.get(
      '[data-cy="album-date-group"][data-date="2026-05-12"] [data-cy="album-photo"]',
    ).should('have.length', 2);
    cy.get(
      '[data-cy="album-date-group"][data-date="2026-05-13"] [data-cy="album-photo"]',
    ).should('have.length', 1);
    cy.get('[data-cy="album-date-group"]')
      .last()
      .should('contain', 'Date unknown')
      .find('[data-cy="album-photo"]')
      .should('have.length', 1);
  });

  it('provides a truthful empty state without making itinerary pins into photos', () => {
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos' },
      { body: { photos: [], nextCursor: null } },
    );
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-empty-state"]')
      .should('be.visible')
      .and('contain', 'No photos yet')
      .and('contain', 'Photos with location data will appear on the map.');
    cy.get('[data-cy="album-empty-state"] svg').should('be.visible');
    cy.get('[data-cy="album-map"]')
      .should('not.contain', 'Your atlas starts')
      .and('not.contain', 'No photos yet');
    cy.get('[data-cy="atlas-stack"]').should('not.exist');
    cy.screenshot('album-empty-desktop', { capture: 'viewport' });
    cy.viewport(390, 844);
    cy.get('[data-cy="album-empty-state"]').should('be.visible');
    cy.screenshot('album-empty-mobile', { capture: 'viewport' });
  });

  it('can filter the album even when the map style cannot load', () => {
    cy.intercept('GET', 'https://tiles.openfreemap.org/styles/*', {
      statusCode: 503,
    });
    visitOwnedTrip('Album');
    cy.contains('The map couldn’t load').should('be.visible');
    cy.get('[data-cy="album-map"]')
      .contains('button', 'Photos around here')
      .click();
    cy.get('[data-cy="album-photo"]').should('have.length', 3);
    cy.get('[data-cy="atlas-unplaced"]').click();
    cy.get('[data-cy="album-photo"]').should('have.length', 1);
  });

  it('keeps a dense shared location in one keyboard-operable stack', () => {
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos' },
      {
        body: {
          photos: Array.from({ length: 30 }, (_, index) => ({
            ...atlasPhotos[0],
            id: `memory-${index}`,
          })),
          nextCursor: null,
        },
      },
    );
    visitOwnedTrip('Album');
    cy.get('[data-cy="atlas-stack"]').should('have.length', 1).focus();
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.get('[data-cy="album-filter"]')
      .should('contain', 'Photos around here')
      .and('be.focused');
    cy.get('[data-cy="album-photo"]').should('have.length', 30);
  });

  it('loads additional metadata and includes it in the atlas', () => {
    cy.intercept({ method: 'GET', pathname: '/trip/*/photos' }, (request) => {
      request.reply({
        body: request.query.cursor
          ? { photos: atlasPhotos.slice(2), nextCursor: null }
          : { photos: atlasPhotos.slice(0, 2), nextCursor: 'next-page' },
      });
    });
    visitOwnedTrip('Album');
    cy.get('[data-cy="atlas-stack"]').should('have.length', 2);
    cy.get('[data-cy="atlas-unplaced"]').should(
      'have.attr',
      'aria-label',
      'Not placed yet, 1 photo',
    );
    cy.get('[data-cy="album-photo"]').should('have.length', 4);
  });

  it('returns to all photos after deleting the final photos in a filtered collection', () => {
    let photos = [...atlasPhotos];
    cy.intercept({ method: 'GET', pathname: '/trip/*/photos' }, (request) =>
      request.reply({ body: { photos, nextCursor: null } }),
    );
    cy.intercept(
      { method: 'DELETE', pathname: '/trip/*/photos/*' },
      (request) => {
        photos = photos.filter(
          (photo) => photo.id !== request.url.split('/').pop(),
        );
        request.reply({ statusCode: 204 });
      },
    );
    visitOwnedTrip('Album');
    cy.get('[data-cy="atlas-stack"][aria-label*="2 photos"]').click();
    cy.get('[data-cy="album-edit-photos"]').click();
    cy.get('[data-cy="album-photo"]').each(($photo) => cy.wrap($photo).click());
    cy.get('[data-cy="album-delete-selected"]').click();
    cy.get('[data-cy="album-confirm-delete"]').click();
    cy.get('[data-cy="album-filter"]').should('not.exist');
    cy.get('[data-cy="album-photo"]').should('have.length', 2);
  });
});

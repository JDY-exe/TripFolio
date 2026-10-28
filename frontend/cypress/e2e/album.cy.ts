import fixture from '../fixtures/album.json';
import featureFixture from '../fixtures/owned-features.json';
import { testAccessToken } from '../support/auth';
import { visitOwnedTrip } from '../support/ownedTrip';

describe('phone photo uploads', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos' },
      {
        body: { photos: [], nextCursor: null },
      },
    );
  });

  it('browses the photo grid and opens a keyboard-navigable viewer', () => {
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos' },
      {
        body: {
          photos: [
            fixture.photo,
            { ...fixture.photo, id: 'photo-2', originalName: 'second.webp' },
          ],
          nextCursor: null,
        },
      },
    );
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      {
        headers: { 'content-type': 'image/png' },
        fixture: 'avatar.png',
      },
    );
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-photo"] img')
      .first()
      .should('be.visible')
      .and(($image) => {
        expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(
          0,
        );
      });
    cy.get('[data-cy="album-photo"]').should('have.length', 2).first().click();
    cy.get('[data-cy="album-photo-viewer"]').should('be.visible');
    cy.contains('button', 'Previous photo').should('be.disabled');
    cy.contains('button', 'Next photo').click();
    cy.get('[role="dialog"]').should('contain', 'second.webp');
    cy.get('[data-cy="album-photo-viewer"]').should(($viewer) => {
      const bounds = $viewer[0].getBoundingClientRect();
      const arrow = $viewer.find('button').last()[0].getBoundingClientRect();
      expect(bounds.height).to.be.greaterThan(500);
      expect(
        Math.abs(
          arrow.top + arrow.height / 2 - (bounds.top + bounds.height / 2),
        ),
      ).to.be.lessThan(2);
    });
    cy.get('[role="dialog"] header').should('have.class', 'sr-only');
    cy.screenshot('album-minimal-photo-viewer', { capture: 'viewport' });
    cy.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    cy.get('[role="dialog"]').should('not.exist');
    cy.viewport(1440, 1000);
    cy.screenshot('album-desktop', { capture: 'viewport' });
    cy.viewport(390, 844);
    cy.get('[data-cy="album-map"]').should('not.be.visible');
    cy.screenshot('album-mobile-photos', { capture: 'viewport' });
    cy.get('[data-cy="album-tab-map"]')
      .click()
      .should('have.attr', 'aria-selected', 'true');
    cy.get('[data-cy="album-photos-panel"]').should('not.be.visible');
    cy.get('[data-cy="album-map"]').should('be.visible');
    cy.screenshot('album-mobile-map', { capture: 'viewport' });
    cy.get('[data-cy="album-tab-map"]').trigger('keydown', {
      key: 'ArrowLeft',
    });
    cy.get('[data-cy="album-tab-photos"]').should('be.focused');
    cy.get('[data-cy="album-photos-panel"]').should('be.visible');
  });
  it('provides a visible close button for a single photo on mobile', () => {
    cy.viewport(390, 844);
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos' },
      { body: { photos: [fixture.photo], nextCursor: null } },
    );
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
    );
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-photo"]').click();
    cy.contains('button', 'Previous photo').should('be.disabled');
    cy.contains('button', 'Next photo').should('be.disabled');
    cy.get('[data-cy="modal-close"]').should('be.visible').and('be.focused');
    cy.screenshot('album-mobile-photo-viewer', { capture: 'viewport' });
    cy.get('[data-cy="modal-close"]').click();
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('[data-cy="album-photo"]').should('be.focused');
  });

  fixture.cacheAccessCases.forEach(({ name, account, canList }) => {
    it(name, () => {
      cy.intercept(
        { method: 'GET', pathname: '/trip/*/photos' },
        { body: { photos: [fixture.photo], nextCursor: null } },
      );
      cy.intercept(
        { method: 'GET', pathname: '/trip/*/photos/*/content' },
        { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
      );
      visitOwnedTrip('Album');
      cy.get('[data-cy="album-photo"] img').should('be.visible');
      cy.contains('button', 'My Trips').click();
      cy.get('[data-cy="nav-profile"]').click();
      cy.get('[data-cy="logout"]').click();
      cy.location('pathname').should('eq', '/auth');

      cy.intercept(
        { method: 'GET', pathname: '/trip/*/photos' },
        canList
          ? { body: { photos: [fixture.photo], nextCursor: null } }
          : { statusCode: 404, body: { message: 'Trip not found' } },
      ).as('nextAccountAlbum');
      cy.intercept(
        { method: 'GET', pathname: '/trip/*/photos/*/content' },
        { statusCode: 404, body: { message: 'Photo not found' } },
      ).as('deniedContent');
      const user =
        account === 'owner' ? featureFixture.user : fixture.otherUser;
      cy.intercept(
        { method: 'POST', pathname: '/users/login' },
        { body: { token: testAccessToken(), user } },
      );
      cy.window().then((window) => {
        window.history.pushState({}, '', `/trip/${featureFixture.trip._id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      cy.location('pathname').should('eq', '/auth');
      cy.get('[data-cy="login-email"]').type(user.email);
      cy.get('[data-cy="login-password"]').type('sample-password');
      cy.get('[data-cy="login-submit"]').click();
      cy.location('pathname').should('eq', `/trip/${featureFixture.trip._id}`);
      cy.get('[data-cy="nav-album"]').click();
      cy.wait('@nextAccountAlbum');
      if (canList) {
        cy.wait('@deniedContent');
        cy.contains('Photo unavailable').should('be.visible');
      } else {
        cy.contains('Your album couldn’t load', { timeout: 12_000 }).should(
          'be.visible',
        );
        cy.get('[data-cy="album-photo"]').should('not.exist');
      }
      cy.get('[data-cy="album-photo"] img').should('not.exist');
    });
  });

  it('scrolls only the photo pane while the desktop map stays in place', () => {
    cy.viewport(1440, 1000);
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos' },
      {
        body: {
          photos: Array.from(
            { length: fixture.scrollPhotoCount },
            (_, index) => ({ ...fixture.photo, id: `photo-${index}` }),
          ),
          nextCursor: null,
        },
      },
    );
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
    );
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-photo"]').should(
      'have.length',
      fixture.scrollPhotoCount,
    );
    cy.get('[data-cy="album-map"]').then(($map) => {
      const top = $map[0].getBoundingClientRect().top;
      cy.get('[data-cy="album-photos-panel"]')
        .scrollTo('bottom')
        .should(($panel) => {
          expect($panel[0].scrollTop).to.be.greaterThan(0);
        });
      cy.get('[data-cy="album-map"]').should(($aside) => {
        expect($aside[0].getBoundingClientRect().top).to.equal(top);
      });
      cy.window().its('scrollY').should('equal', 0);
    });
  });

  it('selects multiple photos, cancels confirmation, and deletes the selection', () => {
    let photos = [
      fixture.photo,
      { ...fixture.photo, id: 'photo-2', originalName: 'second.webp' },
    ];
    cy.intercept({ method: 'GET', pathname: '/trip/*/photos' }, (request) =>
      request.reply({ body: { photos, nextCursor: null } }),
    );
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
    );
    cy.intercept(
      { method: 'DELETE', pathname: '/trip/*/photos/*' },
      (request) => {
        photos = photos.filter(
          (photo) => photo.id !== request.url.split('/').pop(),
        );
        request.reply({ statusCode: 204 });
      },
    ).as('deletePhoto');
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-edit-photos"]').click();
    cy.get('[data-cy="album-delete-selected"]').should('be.disabled');
    cy.get('[data-cy="album-photo"]')
      .first()
      .click()
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy="album-photo-viewer"]').should('not.exist');
    cy.get('[data-cy="album-photo"]').last().click();
    cy.get('[data-cy="album-delete-selected"]').should('have.text', 'Delete 2');
    cy.get('[data-cy="album-delete-selected"]').click();
    cy.contains('[role="dialog"] button', 'Cancel').click();
    cy.get('[data-cy="album-photo"]').should('have.length', 2);
    cy.get('@deletePhoto.all').should('have.length', 0);
    cy.get('[data-cy="album-delete-selected"]').click();
    cy.get('[data-cy="album-confirm-delete"]').click();
    cy.get('@deletePhoto.all').should('have.length', 2);
    cy.get('[data-cy="album-photo"]').should('not.exist');
    cy.get('[data-cy="album-edit-photos"]').should('contain', 'Edit mode');
    cy.get('[data-cy="album-delete-selected"]').should('not.exist');
    cy.get('[data-cy="album-add-photos"]').should('be.visible');
  });

  it('automatically completes a deletion after a transient failure hides the photo', () => {
    let hidden = false;
    let attempts = 0;
    cy.intercept({ method: 'GET', pathname: '/trip/*/photos' }, (request) =>
      request.reply({
        body: { photos: hidden ? [] : [fixture.photo], nextCursor: null },
      }),
    );
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
    );
    cy.intercept(
      { method: 'DELETE', pathname: '/trip/*/photos/*' },
      (request) => {
        attempts += 1;
        hidden = true;
        if (attempts === 1)
          request.reply({
            statusCode: 500,
            body: { message: fixture.deleteError },
          });
        else request.reply({ statusCode: 204 });
      },
    ).as('retryDelete');
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-edit-photos"]').click();
    cy.get('[data-cy="album-photo"]').click();
    cy.get('[data-cy="album-delete-selected"]').click();
    cy.get('[data-cy="album-confirm-delete"]').click();
    cy.get('@retryDelete.all').should('have.length', 2);
    cy.get('[data-cy="album-delete-dialog"]').should('not.exist');
    cy.get('[data-cy="album-photo"]').should('not.exist');
    cy.get('[data-cy="album-add-photos"]').should('be.visible');
    cy.contains('1 photo deleted.').should('be.visible');
    cy.contains(fixture.deleteError).should('not.exist');
  });

  it('retains failed deletions after retries are exhausted and clears selection when editing ends', () => {
    let photos = [
      fixture.photo,
      { ...fixture.photo, id: 'photo-2', originalName: 'second.webp' },
    ];
    cy.intercept({ method: 'GET', pathname: '/trip/*/photos' }, (request) =>
      request.reply({ body: { photos, nextCursor: null } }),
    );
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
    );
    cy.intercept(
      { method: 'DELETE', pathname: '/trip/*/photos/*' },
      (request) => {
        if (request.url.endsWith('/photo-2'))
          request.reply({
            statusCode: 500,
            body: { message: fixture.deleteError },
          });
        else {
          photos = photos.filter((photo) => photo.id !== fixture.photo.id);
          request.reply({ statusCode: 204 });
        }
      },
    );
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-edit-photos"]').click();
    cy.get('[data-cy="album-photo"]').each(($photo) => cy.wrap($photo).click());
    cy.get('[data-cy="album-photo"][aria-pressed="true"]').should(
      'have.length',
      2,
    );
    cy.screenshot('album-edit-selection', { capture: 'viewport' });
    cy.get('[data-cy="album-delete-selected"]').click();
    cy.get('[data-cy="album-confirm-delete"]').click();
    cy.get('[data-cy="album-photo"]')
      .should('have.length', 1)
      .and('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy="album-delete-selected"]').should('have.text', 'Delete 1');
    cy.contains(fixture.deleteError, { matchCase: false }).should('be.visible');
    cy.get('[data-cy="toast"] button').click({ multiple: true });
    cy.get('[data-cy="album-edit-photos"]').click();
    cy.get('[data-cy="album-edit-photos"]').click();
    cy.get('[data-cy="album-delete-selected"]').should('have.text', 'Delete 0');
    cy.viewport(390, 844);
    cy.get('[data-cy="album-photo"]').click();
    cy.screenshot('album-edit-mobile', { capture: 'viewport' });
  });

  it('sends phone originals without browser decoding', () => {
    cy.intercept(
      { method: 'POST', pathname: '/trip/*/photos' },
      {
        statusCode: 201,
        body: { photo: fixture.photo },
      },
    ).as('uploadPhoto');
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-add-photos"]').click();
    cy.get('[role="dialog"]').should('contain', 'Add photos');
    cy.get('[data-cy="album-photo-upload"] input[type="file"]')
      .should('have.attr', 'accept')
      .and('include', '.heic');
    cy.get('[data-cy="album-photo-upload"] input[type="file"]').selectFile(
      fixture.names.map((fileName) => ({
        contents: Cypress.Buffer.from('original phone bytes'),
        fileName,
        mimeType: '',
      })),
      { force: true },
    );
    cy.contains('[role="status"]', '4 of 4 photos uploaded.').should(
      'be.visible',
    );
    cy.get('@uploadPhoto.all').should('have.length', 4);
  });

  it('reports a server rejection and allows retrying the same file', () => {
    cy.intercept(
      { method: 'POST', pathname: '/trip/*/photos' },
      {
        statusCode: 400,
        body: { message: fixture.error },
      },
    ).as('uploadPhoto');
    visitOwnedTrip('Album');
    cy.get('[data-cy="album-add-photos"]').click();
    cy.get('[data-cy="album-photo-upload"] input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('bad file'),
        fileName: fixture.names[0],
        mimeType: '',
      },
      { force: true },
    );
    cy.wait('@uploadPhoto');
    cy.contains(fixture.error).should('be.visible');
    cy.contains('[role="status"]', '0 of 1 photos uploaded.').should(
      'be.visible',
    );
    cy.get('[data-cy="album-photo-upload"] input[type="file"]').should(
      'not.be.disabled',
    );
  });
});

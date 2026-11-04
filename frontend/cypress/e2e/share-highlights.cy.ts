import fixture from '../fixtures/share-highlights.json';
import album from '../fixtures/album.json';
import features from '../fixtures/owned-features.json';
import { visitOwnedTrip } from '../support/ownedTrip';

/** Installs isolated private metadata and byte responses for the real Canvas renderer. */
const setup = (linked = true) => {
  const metadata = [
    ...fixture.events.map((event) => ({
      id: event._id,
      linkedEvent: event._id,
    })),
    ...fixture.extraPhotos,
  ];
  const photos = metadata.map((photo) => ({
    ...album.photo,
    ...photo,
    trip: features.trip._id,
    linkedEvent: linked ? photo.linkedEvent : null,
    contentUrl: `/trip/${features.trip._id}/photos/${photo.id}/content`,
  }));
  cy.clock(Date.parse(fixture.now), ['Date']);
  cy.intercept({ method: 'GET', pathname: '/trip/*/photos' }, (request) => {
    request.reply({
      body: request.query.cursor
        ? { photos: photos.slice(3), nextCursor: null }
        : { photos: photos.slice(0, 3), nextCursor: 'next-page' },
    });
  });
  cy.intercept(
    { method: 'GET', pathname: '/trip/*/photos/*/content' },
    { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
  );
  visitOwnedTrip('Album', {
    events: () =>
      fixture.events.map((event) => ({
        ...features.event,
        ...event,
        endTime: event.startTime,
      })),
  });
};

/** Chooses a format through the compact highlights entry screen. */
const openRecap = (kind: 'daily' | 'dining' | 'experience') => {
  cy.get('[data-cy="album-share-highlights"]').click();
  cy.get(`[data-cy="highlight-${kind}"]`).click();
};

describe('share highlights', () => {
  it('offers compact icon choices and browses, shares and downloads the daily JPEG', () => {
    setup();
    cy.window().then((window) => {
      Object.defineProperty(window.navigator, 'canShare', {
        configurable: true,
        value: () => true,
      });
      const share = cy.stub().resolves();
      cy.wrap(share).as('share');
      Object.defineProperty(window.navigator, 'share', {
        configurable: true,
        value: share,
      });
    });
    cy.get('[data-cy="album-share-highlights"]').click();
    cy.get('[data-cy="highlight-chooser"] button').should('have.length', 3);
    cy.get('[data-cy="highlight-chooser"] svg').should('have.length', 6);
    cy.screenshot('share-highlights-desktop', { capture: 'viewport' });
    cy.viewport(390, 844);
    cy.screenshot('share-highlights-mobile', { capture: 'viewport' });
    cy.get('[data-cy="highlight-daily"]').click();
    cy.get('[data-cy="recap-group"]').should('have.value', '2030-04-02');
    cy.get('[data-cy="recap-image"]').should('be.visible');
    cy.get('[data-cy="recap-group"]').select('2030-04-01');
    cy.get('[data-cy="recap-image"]')
      .should('be.visible')
      .and('have.attr', 'alt')
      .and('contain', 'Morning market');
    cy.get('[data-cy="recap-content"]').should('contain', 'Image 1 of 2');
    cy.get('[data-cy="recap-next"]').click();
    cy.get('[data-cy="recap-image"]')
      .should('be.visible')
      .and('have.attr', 'alt')
      .and('contain', 'Sunset walk');
    cy.get('[data-cy="recap-share"]').click();
    cy.get('@share')
      .should('have.been.calledOnce')
      .then((stub) => {
        const file = (
          stub as unknown as { firstCall: { args: [{ files: File[] }] } }
        ).firstCall.args[0].files[0];
        expect(file.type).to.equal('image/jpeg');
        expect(file.name).to.equal('trip-recap-2030-04-01-02.jpg');
        expect(file.size).to.be.greaterThan(0);
      });
    cy.get('[data-cy="recap-download"]').click();
    cy.readFile('cypress/downloads/trip-recap-2030-04-01-02.jpg', null).should(
      'have.length.greaterThan',
      0,
    );
    cy.screenshot('daily-recap-mobile', { capture: 'viewport' });
    cy.viewport(1440, 1000);
    cy.screenshot('daily-recap-desktop', { capture: 'viewport' });
    cy.get('[data-cy="modal-close"]').click();
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('[data-cy="album-share-highlights"]').should('be.focused');
    cy.get('[data-cy="album-share-highlights"]').click();
    cy.get('[data-cy="highlight-chooser"]').should('be.visible');
    cy.get('[role="dialog"]').should('contain', 'Share highlights');
  });

  it('uses restaurant events only and returns to the choices without retaining an export', () => {
    setup();
    openRecap('dining');
    cy.get('[data-cy="recap-image"]')
      .should('be.visible')
      .and('have.attr', 'alt')
      .and('contain', 'Lunch by the sea')
      .and('not.contain', 'Morning market');
    cy.get('[data-cy="recap-group"]').should('not.exist');
    cy.get('[data-cy="recap-next"]').should('not.exist');
    cy.get('[data-cy="recap-download"]').click();
    cy.readFile(
      'cypress/downloads/dining-recap-2030-04-01-01.jpg',
      null,
    ).should('have.length.greaterThan', 0);
    cy.viewport(390, 844);
    cy.screenshot('dining-recap-mobile', { capture: 'viewport' });
    cy.get('[data-cy="highlight-back"]').click();
    cy.get('[data-cy="highlight-dining"]').should('be.focused');
    cy.get('[data-cy="recap-download"]').should('not.exist');
    cy.get('[data-cy="highlight-experience"]').click();
    cy.get('[data-cy="recap-group"] option').should('have.length', 2);
    cy.get('[data-cy="recap-group"]')
      .should('have.value', 'recap-6')
      .select('recap-1');
    cy.get('[data-cy="recap-image"]')
      .should('be.visible')
      .and('have.attr', 'alt')
      .and('contain', 'Morning market');
    cy.get('[data-cy="recap-download"]').click();
    cy.readFile(
      'cypress/downloads/experience-recap-2030-04-01-recap-1-01.jpg',
      null,
    ).should('have.length.greaterThan', 0);
    cy.screenshot('experience-recap-mobile', { capture: 'viewport' });
  });

  it('explains unavailable formats without fabricating stories from upload dates', () => {
    setup(false);
    for (const kind of ['daily', 'dining', 'experience']) {
      if (kind === 'daily')
        cy.get('[data-cy="album-share-highlights"]').click();
      cy.get(`[data-cy="highlight-${kind}"]`).click();
      cy.get('[data-cy="recap-content"]').should(
        'contain',
        kind === 'daily'
          ? 'No daily recaps yet'
          : kind === 'dining'
            ? 'No dining recap yet'
            : 'No experience recaps yet',
      );
      cy.get('[data-cy="recap-image"]').should('not.exist');
      cy.get('[data-cy="recap-download"]').should('not.exist');
      cy.get('[data-cy="highlight-back"]').click();
    }
  });

  for (const nativeSharing of [false, true]) {
    it(`keeps the panel and preview stable with native sharing ${nativeSharing ? 'available' : 'unavailable'}`, () => {
      setup();
      cy.viewport(390, 844);
      let release: (() => void) | undefined;
      let dialogHeight = 0;
      let frameHeight = 0;
      cy.window().then((window) => {
        Object.defineProperty(window.navigator, 'canShare', {
          configurable: true,
          value: () => nativeSharing,
        });
        Object.defineProperty(window.navigator, 'share', {
          configurable: true,
          value: cy.stub().resolves(),
        });
        const load = window.document.fonts.load.bind(window.document.fonts);
        cy.stub(window.document.fonts, 'load').callsFake(
          (...args: Parameters<FontFaceSet['load']>) =>
            load(...args).then(
              (fonts) =>
                new Promise<FontFace[]>((resolve) => {
                  release = () => resolve(fonts);
                }),
            ),
        );
      });
      openRecap('daily');
      cy.get('[data-cy="recap-skeleton"]').should('be.visible');
      cy.get('[data-cy="modal-panel"]').then(($dialog) => {
        dialogHeight = $dialog[0].getBoundingClientRect().height;
      });
      cy.get('[data-cy="recap-frame"]').then(($frame) => {
        frameHeight = $frame[0].getBoundingClientRect().height;
      });
      cy.get('[data-cy="recap-download"]').should('not.exist');
      cy.wrap(null)
        .should(() => expect(release).to.be.a('function'))
        .then(() => release?.());
      cy.get('[data-cy="recap-image"]').should('be.visible');
      cy.get('[data-cy="recap-skeleton"]').should('not.exist');
      cy.get('[data-cy="modal-panel"]').should(($dialog) => {
        expect($dialog[0].getBoundingClientRect().height).to.be.closeTo(
          dialogHeight,
          1,
        );
      });
      cy.get('[data-cy="recap-frame"]').should(($frame) => {
        expect($frame[0].getBoundingClientRect().height).to.be.closeTo(
          frameHeight,
          1,
        );
      });
      cy.get('[data-cy="recap-next"]').should('not.exist');
      cy.get('[data-cy="recap-share"]').should(
        nativeSharing ? 'be.visible' : 'not.exist',
      );
    });
  }

  it('refetches cached HTTP-200 image bytes when decoding fails and the user retries', () => {
    setup();
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      {
        statusCode: 200,
        headers: { 'content-type': 'image/png' },
        body: 'invalid image bytes',
      },
    );
    openRecap('daily');
    cy.contains('button', 'Retry image').should('be.visible');
    cy.get('[data-cy="recap-download"]').should('not.exist');
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
    ).as('reloadedPhoto');
    cy.contains('button', 'Retry image').click();
    cy.wait('@reloadedPhoto');
    cy.get('[data-cy="recap-image"]').should('be.visible');
  });

  it('offers retry instead of exporting an incomplete image', () => {
    setup();
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      { statusCode: 503 },
    );
    openRecap('daily');
    cy.contains('button', 'Retry image').should('be.visible');
    cy.get('[data-cy="recap-download"]').should('not.exist');
    cy.intercept(
      { method: 'GET', pathname: '/trip/*/photos/*/content' },
      { headers: { 'content-type': 'image/png' }, fixture: 'avatar.png' },
    );
    cy.contains('button', 'Retry image').click();
    cy.get('[data-cy="recap-image"]').should('be.visible');
  });
});

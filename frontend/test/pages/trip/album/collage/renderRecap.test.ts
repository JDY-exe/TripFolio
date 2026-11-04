import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRecap } from '../../../../../src/pages/trip/album/collage/renderRecap';
import type { RecapSlide } from '../../../../../src/pages/trip/album/collage/dailyRecap';
import type { TripPhoto } from '../../../../../src/queries/photos';

const photo = { id: 'photo', width: 400, height: 300 } as TripPhoto;
const slide: RecapSlide = {
  date: '2026-06-12',
  index: 0,
  total: 1,
  layout: 'single',
  moments: [
    { eventId: 'event', label: 'A long caption '.repeat(40), photos: [photo] },
  ],
};
const context = {
  fillRect: vi.fn(),
  fillText: vi.fn(),
  drawImage: vi.fn(),
  measureText: (text: string) => ({ width: text.length * 15 }),
};
const canvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => context),
  toBlob: vi.fn((callback: (blob: Blob | null) => void) =>
    callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
  ),
};
const revoke = vi.fn();
const decode = vi.fn(async () => undefined);
const fonts = vi.fn(async () => [{}]);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('document', {
    createElement: () => canvas,
    fonts: { load: fonts },
  });
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:photo',
    revokeObjectURL: revoke,
  });
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      naturalWidth = 400;
      naturalHeight = 300;
      decode = decode;
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

/** Renders through browser stand-ins to exercise async failure and cleanup paths. */
const render = (overrides: Partial<Parameters<typeof renderRecap>[0]> = {}) =>
  renderRecap({
    slide,
    tripName: 'Our trip',
    today: slide.date,
    signal: new AbortController().signal,
    loadPhoto: async () => new Blob(['photo']),
    ...overrides,
  });

describe('shared recap JPEG renderer', () => {
  it('renders final-resolution content, bounds captions, and frees decoded resources', async () => {
    const blob = await render();
    expect(blob.type).toBe('image/jpeg');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1350);
    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(
      context.fillText.mock.calls.some(([text]) => String(text).endsWith('…')),
    ).toBe(true);
    expect(revoke).toHaveBeenCalledWith('blob:photo');
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });
  it('tries the next ranked photo when a selected image cannot load', async () => {
    const loadPhoto = vi
      .fn()
      .mockRejectedValueOnce(new Error('Missing'))
      .mockResolvedValueOnce(new Blob(['fallback']));
    await render({
      slide: {
        ...slide,
        moments: [
          {
            ...slide.moments[0],
            photos: [photo, { ...photo, id: 'fallback' }],
          },
        ],
      },
      loadPhoto,
    });
    expect(loadPhoto).toHaveBeenCalledTimes(2);
    expect(context.drawImage).toHaveBeenCalledOnce();
  });
  it('renders an experience with distinct photos and one event heading, without repeated cell captions', async () => {
    const spare = { ...photo, id: 'spare' };
    const moments = ['a', 'b', 'c'].map((id) => ({
      eventId: 'event',
      label: 'Museum',
      photos: [{ ...photo, id }, spare],
    }));
    const loadPhoto = vi.fn(async (candidate: TripPhoto) => {
      if (candidate.id === 'a') throw new Error('Unavailable');
      return new Blob(['photo']);
    });
    await render({
      slide: {
        ...slide,
        kind: 'experience',
        heading: 'At Museum',
        layout: 'hero',
        moments,
      },
      loadPhoto,
    });
    expect(context.drawImage).toHaveBeenCalledTimes(3);
    expect(loadPhoto.mock.calls.map(([candidate]) => candidate.id)).toEqual([
      'a',
      'spare',
      'b',
      'c',
    ]);
    expect(
      context.fillText.mock.calls.filter(([text]) => text === 'At Museum'),
    ).toHaveLength(1);
    expect(
      context.fillText.mock.calls.some(([text]) => text === 'Museum'),
    ).toBe(false);
  });
  it('fails rather than reusing the same experience fallback in two cells', async () => {
    const moments = ['a', 'b', 'c'].map((id) => ({
      eventId: 'event',
      label: 'Museum',
      photos: [
        { ...photo, id },
        { ...photo, id: 'spare' },
      ],
    }));
    const loadPhoto = vi.fn(async (candidate: TripPhoto) => {
      if (candidate.id !== 'spare') throw new Error('Unavailable');
      return new Blob(['photo']);
    });
    await expect(
      render({
        slide: { ...slide, kind: 'experience', layout: 'hero', moments },
        loadPhoto,
      }),
    ).rejects.toThrow('couldn’t load');
    expect(
      loadPhoto.mock.calls.filter(([candidate]) => candidate.id === 'spare'),
    ).toHaveLength(1);
    expect(canvas.toBlob).not.toHaveBeenCalled();
  });
  it('does not silently export a partial image when every candidate fails', async () => {
    await expect(
      render({
        loadPhoto: async () => {
          throw new Error('Unavailable');
        },
      }),
    ).rejects.toThrow('couldn’t load');
    expect(canvas.toBlob).not.toHaveBeenCalled();
    expect(canvas.width).toBe(0);
  });
  it('ignores obsolete loads on cancellation and releases their resources', async () => {
    const controller = new AbortController();
    await expect(
      render({
        signal: controller.signal,
        loadPhoto: async () => {
          controller.abort();
          return new Blob(['late']);
        },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(canvas.toBlob).not.toHaveBeenCalled();
  });
  it('reports unavailable fonts and null JPEG encoding explicitly', async () => {
    fonts.mockResolvedValueOnce([]);
    await expect(render()).rejects.toThrow('fonts couldn’t load');
    canvas.toBlob.mockImplementationOnce((callback) => callback(null));
    await expect(render()).rejects.toThrow('JPEG couldn’t be generated');
    expect(canvas.width).toBe(0);
  });
  it('rejects a browser that encodes a different MIME type', async () => {
    canvas.toBlob.mockImplementationOnce((callback) =>
      callback(new Blob(['png'], { type: 'image/png' })),
    );
    await expect(render()).rejects.toThrow('JPEG couldn’t be generated');
  });
});

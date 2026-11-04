import type { TripPhoto } from '../../../../queries/photos';
import {
  formatRecapDate,
  type RecapLayout,
  type RecapSlide,
} from './dailyRecap';

export interface RecapCell {
  x: number;
  y: number;
  width: number;
  height: number;
}
export const RECAP_WIDTH = 1080;
export const RECAP_HEIGHT = 1350;
const CAPTION_HEIGHT = 94;
const FONT = 'Figtree';

/** Defines photo/caption cells in final export pixels with consistent gutters.
 * @param layout - Automatic layout selected for this image.
 * @returns Bounded rectangles below the title and above the footer.
 */
export const getRecapCells = (layout: RecapLayout): RecapCell[] => {
  const x = 48,
    y = 230,
    width = 984,
    height = 1024,
    gap = 20;
  const halfWidth = (width - gap) / 2,
    halfHeight = (height - gap) / 2;
  if (layout === 'single') return [{ x, y, width, height }];
  if (layout === 'side-by-side')
    return [
      { x, y, width: halfWidth, height },
      { x: x + halfWidth + gap, y, width: halfWidth, height },
    ];
  if (layout === 'stacked')
    return [
      { x, y, width, height: halfHeight },
      { x, y: y + halfHeight + gap, width, height: halfHeight },
    ];
  const bottomY = y + halfHeight + gap;
  if (layout === 'hero-four') {
    const third = (width - gap * 2) / 3;
    return [
      { x, y, width, height: halfHeight },
      ...Array.from({ length: 3 }, (_, index) => ({
        x: x + index * (third + gap),
        y: bottomY,
        width: third,
        height: halfHeight,
      })),
    ];
  }
  if (layout === 'hero')
    return [
      { x, y, width, height: halfHeight },
      { x, y: bottomY, width: halfWidth, height: halfHeight },
      {
        x: x + halfWidth + gap,
        y: bottomY,
        width: halfWidth,
        height: halfHeight,
      },
    ];
  return [
    { x, y, width: halfWidth, height: halfHeight },
    { x: x + halfWidth + gap, y, width: halfWidth, height: halfHeight },
    { x, y: bottomY, width: halfWidth, height: halfHeight },
    {
      x: x + halfWidth + gap,
      y: bottomY,
      width: halfWidth,
      height: halfHeight,
    },
  ];
};

/** Wraps even unbroken labels and ellipsizes only the final permitted line.
 * @param context - Export drawing context with its font already set.
 * @param text - User-provided title, normalized to plain single-spaced text.
 * @param cell - Text origin and maximum width.
 * @param lines - Maximum line count.
 * @param lineHeight - Baseline spacing in output pixels.
 * @returns Nothing; paints bounded text directly into the export.
 */
const drawLabel = (
  context: CanvasRenderingContext2D,
  text: string,
  cell: RecapCell,
  lines: number,
  lineHeight: number,
) => {
  const remaining = Array.from(text.replace(/\s+/g, ' ').trim());
  for (let line = 0; line < lines && remaining.length > 0; line++) {
    let label = '';
    while (
      remaining.length > 0 &&
      context.measureText(label + remaining[0]).width <= cell.width
    ) {
      label += remaining.shift();
    }
    if (line === lines - 1 && remaining.length > 0) {
      while (label && context.measureText(`${label}…`).width > cell.width)
        label = label.slice(0, -1);
      label = `${label.trimEnd()}…`;
    }
    context.fillText(label.trim(), cell.x, cell.y + line * lineHeight);
  }
};

/** Loads one protected image Blob into a disposable browser image.
 * @param blob - Authenticated bytes, never a third-party place photo.
 * @returns The decoded image and cleanup function for its object URL.
 */
const decodePhoto = async (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error('Empty photo');
    return {
      image,
      release: () => {
        image.src = '';
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
};

/** Generates the exact JPEG used for preview, download, and native file sharing.
 * @param input - Selected slide, trip name, authenticated loader, and cancellation signal.
 * @returns A final-resolution JPEG Blob, or an actionable error without partial output.
 */
export const renderRecap = async ({
  slide,
  tripName,
  loadPhoto,
  signal,
  today,
}: {
  slide: RecapSlide;
  tripName: string;
  loadPhoto: (photo: TripPhoto) => Promise<Blob>;
  signal: AbortSignal;
  today: string;
}): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = RECAP_WIDTH;
  canvas.height = RECAP_HEIGHT;
  try {
    const fonts = await document.fonts.load(`400 44px ${FONT}`);
    if (fonts.length === 0)
      throw new Error('Recap fonts couldn’t load. Please retry.');
    signal.throwIfAborted();
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Image generation is unavailable in this browser.');
    context.fillStyle = '#f4fbf9';
    context.fillRect(0, 0, RECAP_WIDTH, RECAP_HEIGHT);
    context.textBaseline = 'top';
    context.fillStyle = '#006a66';
    context.font = `400 44px ${FONT}`;
    drawLabel(
      context,
      slide.heading ??
        (slide.date === today ? 'What we did today' : 'A day on our trip'),
      { x: 48, y: 44, width: 984, height: 60 },
      1,
      52,
    );
    context.fillStyle = '#161d1c';
    context.font = `400 34px ${FONT}`;
    drawLabel(
      context,
      tripName,
      { x: 48, y: 108, width: 984, height: 44 },
      1,
      44,
    );
    context.fillStyle = '#3f4948';
    context.font = `400 28px ${FONT}`;
    drawLabel(
      context,
      slide.dateLabel ?? formatRecapDate(slide.date),
      { x: 48, y: 166, width: 984, height: 40 },
      1,
      34,
    );
    const cells = getRecapCells(slide.layout);
    const usedPhotos = new Set<string>();
    for (const [index, moment] of slide.moments.entries()) {
      signal.throwIfAborted();
      let decoded: Awaited<ReturnType<typeof decodePhoto>> | undefined;
      for (const photo of moment.photos) {
        if (usedPhotos.has(photo.id)) continue;
        try {
          const blob = await loadPhoto(photo);
          signal.throwIfAborted();
          decoded = await decodePhoto(blob);
          usedPhotos.add(photo.id);
          break;
        } catch {
          signal.throwIfAborted();
        }
      }
      if (!decoded)
        throw new Error(
          `A photo for “${moment.label}” couldn’t load. Please retry.`,
        );
      try {
        signal.throwIfAborted();
        const cell = cells[index];
        const photoHeight =
          cell.height - (slide.kind === 'experience' ? 0 : CAPTION_HEIGHT);
        const image = decoded.image;
        const scale = Math.max(
          cell.width / image.naturalWidth,
          photoHeight / image.naturalHeight,
        );
        const sourceWidth = cell.width / scale,
          sourceHeight = photoHeight / scale;
        context.drawImage(
          image,
          (image.naturalWidth - sourceWidth) / 2,
          (image.naturalHeight - sourceHeight) / 2,
          sourceWidth,
          sourceHeight,
          cell.x,
          cell.y,
          cell.width,
          photoHeight,
        );
        context.fillStyle = '#161d1c';
        context.font = `400 28px ${FONT}`;
        if (slide.kind !== 'experience') {
          drawLabel(
            context,
            moment.label,
            { ...cell, y: cell.y + photoHeight + 14 },
            2,
            34,
          );
        }
      } finally {
        decoded.release();
      }
    }
    context.fillStyle = '#3f4948';
    context.font = `400 23px ${FONT}`;
    context.fillText('TripFolio', 48, 1290);
    context.textAlign = 'right';
    context.fillText(`${slide.index + 1} / ${slide.total}`, 1032, 1290);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => {
          if (result?.type === 'image/jpeg') resolve(result);
          else
            reject(new Error('The JPEG couldn’t be generated. Please retry.'));
        },
        'image/jpeg',
        0.9,
      ),
    );
    signal.throwIfAborted();
    return blob;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
};

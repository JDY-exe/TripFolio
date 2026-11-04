import album from './album.json';

export const atlasPhotos = [
  {
    ...album.photo,
    id: 'memory-a',
    originalName: 'river.webp',
    takenAt: '2026-05-12T16:30:00',
    location: { latitude: 41.9, longitude: 12.49 },
    linkedEvent: null,
  },
  {
    ...album.photo,
    id: 'memory-b',
    originalName: 'coffee.webp',
    takenAt: '2026-05-12T23:50:00',
    location: { latitude: 41.9, longitude: 12.49 },
    linkedEvent: null,
  },
  {
    ...album.photo,
    id: 'memory-c',
    originalName: 'coast.webp',
    takenAt: '2026-05-13T08:00:00',
    location: { latitude: 40.8, longitude: 14.25 },
    linkedEvent: null,
  },
  {
    ...album.photo,
    id: 'memory-unplaced',
    originalName: 'train.webp',
    takenAt: null,
    location: null,
    linkedEvent: null,
  },
];

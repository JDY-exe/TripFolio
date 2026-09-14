import { afterEach, describe, expect, it } from 'vitest';
import {
  getMediaUploadAccept,
  getMediaUploadLabel,
} from '../../../src/components/common/MediaUpload/mediaUploadConfig';
import { announceMediaUploadFiles } from '../../../src/components/common/MediaUpload/mediaUploadSelection';
import {
  clearAlerts,
  getAlertsSnapshot,
} from '../../../src/components/common/Toast/toastStore';

afterEach(() => clearAlerts());

describe('getMediaUploadAccept', () => {
  it('maps one media category to its MIME wildcard', () => {
    expect(getMediaUploadAccept('image')).toBe('image/*');
  });

  it('combines media categories without duplicate patterns', () => {
    expect(getMediaUploadAccept(['image', 'video', 'image'])).toBe(
      'image/*,video/*',
    );
  });

  it('leaves selection unrestricted when any file is allowed', () => {
    expect(getMediaUploadAccept(['image', 'any'])).toBeUndefined();
    expect(getMediaUploadAccept([])).toBeUndefined();
  });
});

describe('getMediaUploadLabel', () => {
  it('uses media-aware singular and plural labels', () => {
    expect(getMediaUploadLabel('image', false)).toBe('Choose photo');
    expect(getMediaUploadLabel('image', true)).toBe('Choose photos');
    expect(getMediaUploadLabel(['image', 'video'], true)).toBe('Choose media');
  });
});

describe('announceMediaUploadFiles', () => {
  it('queues one alert per filename without requiring file contents', () => {
    announceMediaUploadFiles([
      { name: 'lake.jpg' },
      { name: 'train-window.mp4' },
    ]);

    expect(getAlertsSnapshot().map((alert) => alert.message)).toEqual([
      'lake.jpg',
      'train-window.mp4',
    ]);
  });
});

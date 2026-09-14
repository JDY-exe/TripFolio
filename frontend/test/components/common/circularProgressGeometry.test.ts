import { describe, expect, it } from 'vitest';
import {
  createCircularProgressGeometry,
  getCircularProgressDashes,
  normalizeCircularProgress,
} from '../../../src/components/common/CircularProgressIndicator/circularProgressGeometry';

describe('normalizeCircularProgress', () => {
  it('normalizes and clamps determinate values', () => {
    expect(normalizeCircularProgress(25, 100)).toBe(0.25);
    expect(normalizeCircularProgress(-10, 100)).toBe(0);
    expect(normalizeCircularProgress(120, 100)).toBe(1);
  });

  it('protects SVG output from invalid values', () => {
    expect(normalizeCircularProgress(Number.NaN, 100)).toBe(0);
    expect(normalizeCircularProgress(20, 0)).toBe(0);
  });
});

describe('createCircularProgressGeometry', () => {
  it('creates a closed, top-origin wavy path inside the viewport', () => {
    const geometry = createCircularProgressGeometry(52, 8, 2, 18);

    expect(geometry.radius).toBe(20);
    expect(geometry.path).toMatch(/^M 26\.000 6\.000/);
    expect(geometry.path).toMatch(/ Z$/);
    expect(geometry.path).not.toContain('NaN');
  });

  it('falls back to finite geometry for malformed numeric input', () => {
    const geometry = createCircularProgressGeometry(
      Number.NaN,
      Number.NaN,
      Number.NaN,
      Number.NaN,
    );

    expect(geometry.radius).toBe(0);
    expect(geometry.path).not.toContain('NaN');
  });
});

describe('getCircularProgressDashes', () => {
  it('shows only the track at zero and only the indicator at completion', () => {
    expect(getCircularProgressDashes(0, 4, 20)).toEqual({
      active: '0 100',
      track: '100 0',
      trackOffset: 0,
    });
    expect(getCircularProgressDashes(1, 4, 20)).toEqual({
      active: '100 0',
      track: '0 100',
      trackOffset: 0,
    });
  });

  it('places a separated inactive track after partial progress', () => {
    const dashes = getCircularProgressDashes(0.5, 4, 20);

    expect(dashes.active).toBe('50 50');
    expect(Number.parseFloat(dashes.track)).toBeLessThan(50);
    expect(dashes.trackOffset).toBeLessThan(-50);
  });
});

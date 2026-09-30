import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearAlerts,
  dismissAlert,
  displayAlert,
  getAlertsSnapshot,
  subscribeToAlerts,
} from '../../../src/components/common/Toast/toastStore';

afterEach(() => {
  clearAlerts();
  vi.useRealTimers();
});

describe('toastStore', () => {
  it('normalizes string alerts with informational defaults', () => {
    const id = displayAlert('Trip saved');

    expect(getAlertsSnapshot()).toEqual([
      expect.objectContaining({
        id,
        message: 'Trip saved',
        tone: 'info',
        duration: 5000,
      }),
    ]);
  });

  it('marks a persistent alert as exiting before removing it', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToAlerts(listener);
    const id = displayAlert({
      title: 'Offline',
      message: 'Changes will sync later.',
      tone: 'warning',
      duration: 0,
    });

    dismissAlert(id);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(getAlertsSnapshot()).toEqual([
      expect.objectContaining({ id, isExiting: true }),
    ]);

    vi.advanceTimersByTime(199);
    expect(getAlertsSnapshot()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(getAlertsSnapshot()).toHaveLength(0);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it('automatically dismisses alerts after their duration', () => {
    vi.useFakeTimers();
    displayAlert({ message: 'Updated', tone: 'success', duration: 1200 });

    vi.advanceTimersByTime(1199);
    expect(getAlertsSnapshot()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(getAlertsSnapshot()).toEqual([
      expect.objectContaining({ isExiting: true }),
    ]);

    vi.advanceTimersByTime(200);
    expect(getAlertsSnapshot()).toHaveLength(0);
  });
});

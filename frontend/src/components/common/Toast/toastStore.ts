export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertOptions {
  message: string;
  title?: string;
  tone?: AlertTone;
  duration?: number;
}

export interface ToastAlert extends Required<
  Pick<AlertOptions, 'message' | 'tone'>
> {
  id: string;
  title?: string;
  duration: number;
  isExiting?: boolean;
}

type AlertListener = () => void;

const defaultDuration = 5000;
const exitAnimationDuration = 200;
const listeners = new Set<AlertListener>();
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const exitTimers = new Map<string, ReturnType<typeof setTimeout>>();
let alerts: readonly ToastAlert[] = [];
let nextAlertId = 0;

/**
 * Notifies every mounted toast viewport that the alert snapshot changed.
 * A copied listener list allows subscriptions to change safely during delivery.
 *
 * @returns Nothing.
 */
const emitChange = () => {
  const currentListeners = [...listeners];
  currentListeners.forEach((listener) => listener());
};

/**
 * Returns the stable alert snapshot consumed by React's external-store hook.
 * The reference changes only when the queue changes to prevent needless renders.
 *
 * @returns The current read-only alert queue.
 */
export const getAlertsSnapshot = () => {
  return alerts;
};

/**
 * Subscribes a viewport to global alert queue changes.
 * The returned cleanup removes the exact listener supplied by React.
 *
 * @param listener - Callback invoked whenever alerts are added or removed.
 * @returns A cleanup function that cancels the subscription.
 */
export const subscribeToAlerts = (listener: AlertListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Removes an alert after its exit animation has finished.
 * The helper also clears both timers so no stale callbacks remain.
 *
 * @param id - Unique identifier for the alert to remove.
 * @returns Nothing.
 */
const removeAlert = (id: string) => {
  const nextAlerts = alerts.filter((alert) => alert.id !== id);
  if (nextAlerts.length === alerts.length) return;

  const expiryTimer = expiryTimers.get(id);
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimers.delete(id);

  const exitTimer = exitTimers.get(id);
  if (exitTimer) clearTimeout(exitTimer);
  exitTimers.delete(id);

  alerts = nextAlerts;
  emitChange();
};

/**
 * Starts dismissing one alert and removes it when the fade-out completes.
 * Marking the alert as exiting keeps it mounted long enough for CSS to animate.
 *
 * @param id - Unique identifier returned by `displayAlert`.
 * @returns Nothing.
 */
export const dismissAlert = (id: string) => {
  const alert = alerts.find((candidate) => candidate.id === id);
  if (!alert || alert.isExiting) return;

  const timer = expiryTimers.get(id);
  if (timer) clearTimeout(timer);
  expiryTimers.delete(id);

  alerts = alerts.map((candidate) =>
    candidate.id === id ? { ...candidate, isExiting: true } : candidate,
  );
  emitChange();

  exitTimers.set(
    id,
    setTimeout(() => removeAlert(id), exitAnimationDuration),
  );
};

/**
 * Enqueues a global toast alert from any application module.
 * String shorthand creates an informational alert; object input selects title,
 * semantic tone, and duration. A duration of zero keeps the alert until dismissed.
 *
 * @param alert - Message shorthand or fully configured alert.
 * @returns The alert identifier, which can be passed to `dismissAlert`.
 */
export const displayAlert = (alert: string | AlertOptions) => {
  const options = typeof alert === 'string' ? { message: alert } : alert;
  nextAlertId += 1;

  const toast: ToastAlert = {
    id: `toast-${Date.now()}-${nextAlertId}`,
    message: options.message,
    tone: options.tone ?? 'info',
    duration: options.duration ?? defaultDuration,
    isExiting: false,
    ...(options.title ? { title: options.title } : {}),
  };

  alerts = [...alerts, toast];
  emitChange();

  if (toast.duration > 0) {
    expiryTimers.set(
      toast.id,
      setTimeout(() => dismissAlert(toast.id), toast.duration),
    );
  }

  return toast.id;
};

/**
 * Removes all alerts and timers from the global queue.
 * This is useful when tearing down an application session or isolating tests.
 *
 * @returns Nothing.
 */
export const clearAlerts = () => {
  expiryTimers.forEach((timer) => clearTimeout(timer));
  expiryTimers.clear();
  exitTimers.forEach((timer) => clearTimeout(timer));
  exitTimers.clear();
  if (alerts.length === 0) return;

  alerts = [];
  emitChange();
};

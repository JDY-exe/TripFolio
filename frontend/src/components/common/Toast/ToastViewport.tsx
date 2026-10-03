import { useSyncExternalStore } from 'react';
import Toast from './Toast';
import {
  dismissAlert,
  getAlertsSnapshot,
  subscribeToAlerts,
  type ToastAlert,
} from './toastStore';

const emptyAlerts: readonly ToastAlert[] = [];

/**
 * Renders the application-wide stack of queued toast notifications.
 * React subscribes to the module-level alert store so callers can display a toast
 * without prop drilling or coupling feature components to a provider.
 *
 * @returns A fixed notification viewport, or nothing when the queue is empty.
 */
const ToastViewport = () => {
  const alerts = useSyncExternalStore(
    subscribeToAlerts,
    getAlertsSnapshot,
    () => emptyAlerts,
  );

  if (alerts.length === 0) return null;

  return (
    <aside className="pointer-events-none fixed inset-x-4 top-4 z-50 ml-auto flex max-w-sm flex-col sm:inset-x-auto sm:right-6 sm:top-6 sm:w-full">
      <h2 className="sr-only">Notifications</h2>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`${
            alert.isExiting
              ? 'grid-rows-[0fr] pb-0'
              : 'grid-rows-[1fr] pb-3 last:pb-0'
          } pointer-events-auto grid transition-[grid-template-rows,padding] duration-200 ease-standard motion-reduce:transition-none`}
        >
          <div className="min-h-0 overflow-hidden">
            <Toast alert={alert} onDismiss={dismissAlert} />
          </div>
        </div>
      ))}
    </aside>
  );
};

export default ToastViewport;

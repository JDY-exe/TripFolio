import { useSyncExternalStore } from 'react'
import Toast from './Toast'
import {
  dismissAlert,
  getAlertsSnapshot,
  subscribeToAlerts,
  type ToastAlert,
} from './toastStore'

const emptyAlerts: readonly ToastAlert[] = []

/**
 * Renders the application-wide stack of queued toast notifications.
 * React subscribes to the module-level alert store so callers can display a toast
 * without prop drilling or coupling feature components to a provider.
 *
 * @returns A fixed notification viewport, or nothing when the queue is empty.
 */
function ToastViewport() {
  const alerts = useSyncExternalStore(
    subscribeToAlerts,
    getAlertsSnapshot,
    () => emptyAlerts,
  )

  if (alerts.length === 0) return null

  return (
    <aside
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 ml-auto flex max-w-sm flex-col gap-3 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-full"
    >
      {alerts.map((alert) => (
        <div key={alert.id} className="pointer-events-auto">
          <Toast alert={alert} onDismiss={dismissAlert} />
        </div>
      ))}
    </aside>
  )
}

export default ToastViewport

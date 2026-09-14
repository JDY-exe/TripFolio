import { AlertCircle, CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import type { ComponentType } from 'react'
import IconButton from '../IconButton/IconButton'
import Text from '../Text/Text'
import type { AlertTone, ToastAlert } from './toastStore'

const toneStyles = {
  info: {
    accent: 'bg-secondary',
    icon: 'bg-secondary-container text-on-secondary-container',
  },
  success: {
    accent: 'bg-primary',
    icon: 'bg-primary-container text-on-primary-container',
  },
  warning: {
    accent: 'bg-warning',
    icon: 'bg-warning-container text-on-warning-container',
  },
  error: {
    accent: 'bg-error',
    icon: 'bg-error-container text-on-error-container',
  },
} satisfies Record<AlertTone, { accent: string; icon: string }>

const toneIcons = {
  info: Info,
  success: CheckCircle2,
  warning: CircleAlert,
  error: AlertCircle,
} satisfies Record<
  AlertTone,
  ComponentType<{ className?: string; size?: number }>
>

export interface ToastProps {
  alert: ToastAlert
  onDismiss: (id: string) => void
}

/**
 * Renders one accessible notification with semantic tone and dismissal control.
 * Tone tokens select the foreground, container color, and icon while alert
 * urgency determines whether assistive technology receives a status or alert.
 *
 * @param props - Alert content and dismissal behavior.
 * @param props.alert - Normalized alert from the global toast store.
 * @param props.onDismiss - Called with the alert identifier when closed.
 * @returns A styled, accessible toast notification.
 */
function Toast({ alert, onDismiss }: ToastProps) {
  const ToneIcon = toneIcons[alert.tone]
  const toneStyle = toneStyles[alert.tone]
  const isUrgent = alert.tone === 'warning' || alert.tone === 'error'

  return (
    <article
      role={isUrgent ? 'alert' : 'status'}
      className="relative flex w-full items-start gap-3 overflow-hidden rounded-panel border border-outline-variant/60 bg-surface-container-high p-4 pl-5 text-on-surface shadow-raised motion-safe:animate-[toast-in_240ms_var(--ease-standard)]"
    >
      <span
        aria-hidden
        className={`${toneStyle.accent} absolute inset-y-3 left-0 w-1 rounded-r-full`}
      />
      <span
        className={`${toneStyle.icon} grid size-10 shrink-0 place-items-center rounded-xl`}
      >
        <ToneIcon aria-hidden size={21} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        {alert.title ? (
          <Text as="h2" variant="label">
            {alert.title}
          </Text>
        ) : null}
        <Text
          color={alert.title ? 'muted' : 'default'}
          className={alert.title ? 'mt-1 text-sm' : 'text-sm'}
        >
          {alert.message}
        </Text>
      </div>
      <IconButton
        aria-label="Dismiss notification"
        size="sm"
        variant="ghost"
        icon={<X aria-hidden size={18} />}
        onClick={() => onDismiss(alert.id)}
        className="-mr-2 -mt-2 text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface"
      />
    </article>
  )
}

export default Toast

import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { getExpandedFlexGrow } from './bottomNavLayout'

export interface BottomNavItem {
  icon: LucideIcon
  label: string
  value: string
}

interface BottomNavAction {
  icon: LucideIcon
  label: string
  onClick: () => void
}

interface BottomNavProps {
  'aria-label': string
  items: readonly BottomNavItem[]
  value: string
  onChange: (value: string) => void
  leadingAction?: BottomNavAction
}

const actionClasses =
  'flex min-h-11 items-center justify-center rounded-full text-on-surface-variant select-none cursor-pointer hover:bg-primary/8 hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-safe:transition-[background-color,color,flex-grow] motion-safe:duration-200 motion-safe:ease-standard'

/**
 * Renders a floating navigation dock with native buttons and semantic utilities.
 * Selection stays controlled by the parent; CSS variables size the expanding row.
 *
 * @param props - Navigation items, current selection, and optional leading action.
 * @param props.aria-label - Accessible name for the navigation landmark.
 * @param props.items - Icon, label, and value for each destination.
 * @param props.value - Currently selected destination.
 * @param props.onChange - Called with the activated destination's value.
 * @param props.leadingAction - Independent action shown before the destinations.
 * @returns A responsive, keyboard-accessible navigation dock.
 */
function BottomNav({
  'aria-label': ariaLabel,
  items,
  value,
  onChange,
  leadingAction,
}: BottomNavProps) {
  const LeadingIcon = leadingAction?.icon
  const rowStyle = {
    '--nav-width': `${items.length * 120}px`,
    '--nav-hover-grow': getExpandedFlexGrow(items.length, 1.1),
    '--nav-pressed-grow': getExpandedFlexGrow(items.length, 1.2),
  } as CSSProperties

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
      <nav
        aria-label={ariaLabel}
        className="pointer-events-auto flex w-full max-w-full gap-1 overflow-x-auto rounded-dock bg-surface-container p-1 shadow-raised sm:w-auto"
      >
        {leadingAction && LeadingIcon ? (
          <button
            type="button"
            aria-label={leadingAction.label}
            onClick={leadingAction.onClick}
            className={`${actionClasses} min-w-11 shrink-0 gap-1.5 px-2 text-label active:bg-primary/12 sm:px-4`}
          >
            <LeadingIcon
              aria-hidden
              size={18}
              strokeWidth={2}
              className="shrink-0"
            />
            <span className="hidden whitespace-nowrap sm:inline">
              {leadingAction.label}
            </span>
          </button>
        ) : null}

        <div
          className="flex min-w-0 flex-1 gap-1 sm:w-(--nav-width)"
          style={rowStyle}
        >
          {items.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={item.value === value}
                onClick={() => onChange(item.value)}
                className={`${actionClasses} min-w-0 flex-1 flex-col gap-1 px-1 py-2 text-xs hover:grow-(--nav-hover-grow) active:grow-(--nav-pressed-grow) aria-pressed:bg-primary aria-pressed:text-on-primary aria-pressed:focus-visible:outline-on-primary sm:flex-row sm:gap-1.5 sm:px-4 sm:py-0 sm:text-label`}
              >
                <Icon
                  aria-hidden
                  size={18}
                  strokeWidth={2}
                  className="shrink-0"
                />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default BottomNav

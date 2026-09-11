import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Paper from '@mui/material/Paper'
import { alpha } from '@mui/material/styles'
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

/**
 * Renders a controlled, floating bottom navigation button group.
 *
 * The component applies MD3 connected-button-group shapes and state colors,
 * while leaving routing or local-view behavior entirely to its parent through
 * the selected value and change callback.
 *
 * @param props - Controlled navigation content and selection behavior.
 * @param props.aria-label - Accessible name for the navigation landmark.
 * @param props.items - Buttons displayed in the connected group.
 * @param props.value - Value of the currently selected button.
 * @param props.onChange - Callback invoked with a button's value when selected.
 * @param props.leadingAction - Optional independent action placed before the group.
 * @returns A responsive bottom navigation dock.
 */
function BottomNav({
  'aria-label': ariaLabel,
  items,
  value,
  onChange,
  leadingAction,
}: BottomNavProps) {
  const LeadingIcon = leadingAction?.icon
  const hoverFlexGrow = getExpandedFlexGrow(items.length, 1.1)
  const pressedFlexGrow = getExpandedFlexGrow(items.length, 1.2)

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        display: 'flex',
        justifyContent: 'center',
        px: { xs: 0.75, sm: 3 },
        pb: 'max(12px, env(safe-area-inset-bottom))',
        pointerEvents: 'none',
      }}
    >
      <Paper
        component="nav"
        aria-label={ariaLabel}
        elevation={0}
        sx={(theme) => ({
          display: 'flex',
          width: { xs: '100%', sm: 'auto' },
          maxWidth: '100%',
          gap: 0.1875,
          overflowX: 'auto',
          p: 0.375,
          borderRadius: `${theme.md3.shape.extraLarge}px`,
          backgroundColor: theme.palette.surfaceContainer,
          boxShadow: theme.md3.elevation.level2,
          pointerEvents: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        })}
      >
        {leadingAction && LeadingIcon ? (
          <ButtonBase
            disableRipple
            aria-label={leadingAction.label}
            onClick={leadingAction.onClick}
            sx={(theme) => ({
              flex: { xs: '0 0 36px', sm: '0 0 auto' },
              minWidth: 36,
              minHeight: 36,
              gap: 0.75,
              px: { xs: 1.125, sm: 1.5 },
              border: '1px solid transparent',
              borderRadius: `${theme.md3.shape.full}px ${theme.md3.shape.small}px ${theme.md3.shape.small}px ${theme.md3.shape.full}px`,
              color: theme.palette.onSurfaceVariant,
              transition: theme.transitions.create(
                ['background-color', 'border-color', 'color', 'transform'],
                {
                  duration: theme.md3.duration.short4,
                  easing: theme.md3.easing.standard,
                },
              ),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.onSurface,
              },
              '&:active': {
                transform: 'scale(0.96)',
              },
              '&.Mui-focusVisible': {
                outline: `3px solid ${theme.palette.primary.main}`,
                outlineOffset: -3,
              },
            })}
          >
            <LeadingIcon aria-hidden size={18} strokeWidth={2} />
            <Box
              component="span"
              sx={{
                display: { xs: 'none', sm: 'inline' },
                typography: 'button',
                fontSize: '0.65625rem',
                whiteSpace: 'nowrap',
              }}
            >
              {leadingAction.label}
            </Box>
          </ButtonBase>
        ) : null}

        <Box
          role="group"
          sx={{
            display: 'flex',
            flex: '1 1 auto',
            width: { xs: 'auto', sm: items.length * 120 },
            minWidth: 0,
            gap: 0.1875,
          }}
        >
          {items.map((item, index) => {
            const Icon = item.icon
            const selected = item.value === value
            const firstItem = index === 0
            const lastItem = index === items.length - 1

            return (
              <ButtonBase
                key={item.value}
                disableRipple
                aria-pressed={selected}
                onClick={() => onChange(item.value)}
                sx={(theme) => ({
                  flex: '1 1 0',
                  minWidth: 0,
                  minHeight: 36,
                  gap: 0.75,
                  px: { xs: 1.125, sm: 1.875 },
                  overflow: 'hidden',
                  border: '1px solid transparent',
                  borderRadius: selected
                    ? `${theme.md3.shape.full}px`
                    : `${firstItem ? theme.md3.shape.full : theme.md3.shape.small}px ${lastItem ? theme.md3.shape.full : theme.md3.shape.small}px ${lastItem ? theme.md3.shape.full : theme.md3.shape.small}px ${firstItem ? theme.md3.shape.full : theme.md3.shape.small}px`,
                  backgroundColor: selected
                    ? theme.palette.primary.main
                    : 'transparent',
                  color: selected
                    ? theme.palette.primary.contrastText
                    : theme.palette.onSurfaceVariant,
                  transition: theme.transitions.create(
                    ['background-color', 'border-radius', 'color', 'flex-grow'],
                    {
                      duration: theme.md3.duration.medium1,
                      easing: theme.md3.easing.emphasized,
                    },
                  ),
                  '&:hover': {
                    flexGrow: hoverFlexGrow,
                    backgroundColor: selected
                      ? theme.palette.primary.main
                      : alpha(theme.palette.primary.main, 0.08),
                    color: selected
                      ? theme.palette.primary.contrastText
                      : theme.palette.onSurface,
                  },
                  '&:active': {
                    flexGrow: pressedFlexGrow,
                  },
                  '&.Mui-focusVisible': {
                    outline: `3px solid ${theme.palette.primary.main}`,
                    outlineOffset: -3,
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transitionDuration: '0.01ms',
                  },
                })}
              >
                <Icon
                  aria-hidden
                  size={18}
                  strokeWidth={selected ? 2.5 : 2}
                  style={{ flexShrink: 0 }}
                />
                <Box
                  component="span"
                  sx={{
                    overflow: 'hidden',
                    typography: 'button',
                    fontSize: '0.65625rem',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </Box>
              </ButtonBase>
            )
          })}
        </Box>
      </Paper>
    </Box>
  )
}

export default BottomNav

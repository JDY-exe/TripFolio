import type {
  materialDuration,
  materialEasing,
  materialElevation,
  materialShape,
} from './materialTokens'
import type { materialTypeScale } from './typography'

declare module '@mui/material/styles' {
  interface Palette {
    primaryContainer: string
    onPrimaryContainer: string
    secondaryContainer: string
    onSecondaryContainer: string
    tertiary: string
    onTertiary: string
    tertiaryContainer: string
    onTertiaryContainer: string
    errorContainer: string
    onErrorContainer: string
    surface: string
    onSurface: string
    surfaceVariant: string
    onSurfaceVariant: string
    surfaceDim: string
    surfaceBright: string
    surfaceContainerLowest: string
    surfaceContainerLow: string
    surfaceContainer: string
    surfaceContainerHigh: string
    surfaceContainerHighest: string
    outline: string
    outlineVariant: string
    shadow: string
    scrim: string
    inverseSurface: string
    inverseOnSurface: string
    inversePrimary: string
  }

  interface PaletteOptions {
    primaryContainer?: string
    onPrimaryContainer?: string
    secondaryContainer?: string
    onSecondaryContainer?: string
    tertiary?: string
    onTertiary?: string
    tertiaryContainer?: string
    onTertiaryContainer?: string
    errorContainer?: string
    onErrorContainer?: string
    surface?: string
    onSurface?: string
    surfaceVariant?: string
    onSurfaceVariant?: string
    surfaceDim?: string
    surfaceBright?: string
    surfaceContainerLowest?: string
    surfaceContainerLow?: string
    surfaceContainer?: string
    surfaceContainerHigh?: string
    surfaceContainerHighest?: string
    outline?: string
    outlineVariant?: string
    shadow?: string
    scrim?: string
    inverseSurface?: string
    inverseOnSurface?: string
    inversePrimary?: string
  }

  interface Theme {
    md3: {
      shape: typeof materialShape
      elevation: typeof materialElevation
      duration: typeof materialDuration
      easing: typeof materialEasing
      typeScale: typeof materialTypeScale
    }
  }

  interface ThemeOptions {
    md3?: Theme['md3']
  }
}

export {}

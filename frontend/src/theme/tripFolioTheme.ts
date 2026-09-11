import { createTheme, type PaletteOptions } from '@mui/material/styles'
import {
  materialDarkColors,
  materialDuration,
  materialEasing,
  materialElevation,
  materialLightColors,
  materialShape,
  type MaterialColorScheme,
} from './materialTokens'
import { materialTypography, materialTypeScale } from './typography'

/**
 * Converts a complete Material 3 color role set into a MUI palette.
 *
 * Standard roles are mapped to MUI's built-in palette groups, while MD3-only
 * roles remain first-class custom palette tokens for component specifications.
 *
 * @param colors - Material 3 semantic colors for one brightness scheme.
 * @returns A MUI palette containing both standard and MD3-specific roles.
 */
function createMaterialPalette(colors: MaterialColorScheme): PaletteOptions {
  return {
    primary: { main: colors.primary, contrastText: colors.onPrimary },
    secondary: { main: colors.secondary, contrastText: colors.onSecondary },
    error: { main: colors.error, contrastText: colors.onError },
    background: { default: colors.background, paper: colors.surfaceContainer },
    text: { primary: colors.onSurface, secondary: colors.onSurfaceVariant },
    divider: colors.outlineVariant,
    primaryContainer: colors.primaryContainer,
    onPrimaryContainer: colors.onPrimaryContainer,
    secondaryContainer: colors.secondaryContainer,
    onSecondaryContainer: colors.onSecondaryContainer,
    tertiary: colors.tertiary,
    onTertiary: colors.onTertiary,
    tertiaryContainer: colors.tertiaryContainer,
    onTertiaryContainer: colors.onTertiaryContainer,
    errorContainer: colors.errorContainer,
    onErrorContainer: colors.onErrorContainer,
    surface: colors.surface,
    onSurface: colors.onSurface,
    surfaceVariant: colors.surfaceVariant,
    onSurfaceVariant: colors.onSurfaceVariant,
    surfaceDim: colors.surfaceDim,
    surfaceBright: colors.surfaceBright,
    surfaceContainerLowest: colors.surfaceContainerLowest,
    surfaceContainerLow: colors.surfaceContainerLow,
    surfaceContainer: colors.surfaceContainer,
    surfaceContainerHigh: colors.surfaceContainerHigh,
    surfaceContainerHighest: colors.surfaceContainerHighest,
    outline: colors.outline,
    outlineVariant: colors.outlineVariant,
    shadow: colors.shadow,
    scrim: colors.scrim,
    inverseSurface: colors.inverseSurface,
    inverseOnSurface: colors.inverseOnSurface,
    inversePrimary: colors.inversePrimary,
  }
}

/**
 * Global TripFolio theme built from the Material Design 3 baseline tokens.
 *
 * MUI emits both schemes as CSS variables, allowing its components and Tailwind
 * utilities to consume the same semantic design tokens.
 */
export const tripFolioTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  colorSchemes: {
    light: { palette: createMaterialPalette(materialLightColors) },
    dark: { palette: createMaterialPalette(materialDarkColors) },
  },
  typography: materialTypography,
  shape: { borderRadius: materialShape.medium },
  transitions: {
    easing: {
      easeInOut: materialEasing.standard,
      easeOut: materialEasing.standardDecelerate,
      easeIn: materialEasing.standardAccelerate,
      sharp: materialEasing.emphasizedAccelerate,
    },
    duration: {
      shortest: materialDuration.short2,
      shorter: materialDuration.short3,
      short: materialDuration.short4,
      standard: materialDuration.medium2,
      complex: materialDuration.medium4,
      enteringScreen: materialDuration.medium2,
      leavingScreen: materialDuration.short4,
    },
  },
  md3: {
    shape: materialShape,
    elevation: materialElevation,
    duration: materialDuration,
    easing: materialEasing,
    typeScale: materialTypeScale,
  },
})

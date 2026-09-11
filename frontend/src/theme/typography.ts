import type { TypographyVariantsOptions } from '@mui/material/styles'

/** Figtree font stack used by both MUI components and Tailwind utilities. */
export const materialFontFamily = [
  'Figtree',
  'ui-sans-serif',
  'system-ui',
  'sans-serif',
].join(',')

/**
 * Maps the Material Design 3 type scale onto MUI's semantic variants.
 *
 * The less common MD3 roles remain available through the exported token object
 * while the closest MUI variants receive the canonical size, leading, weight,
 * and tracking values.
 */
export const materialTypography: TypographyVariantsOptions = {
  fontFamily: materialFontFamily,
  h1: {
    fontSize: '3.5625rem',
    fontWeight: 400,
    lineHeight: '4rem',
    letterSpacing: '-0.015625rem',
  },
  h2: {
    fontSize: '2.8125rem',
    fontWeight: 400,
    lineHeight: '3.25rem',
    letterSpacing: 0,
  },
  h3: {
    fontSize: '2.25rem',
    fontWeight: 400,
    lineHeight: '2.75rem',
    letterSpacing: 0,
  },
  h4: {
    fontSize: '2rem',
    fontWeight: 400,
    lineHeight: '2.5rem',
    letterSpacing: 0,
  },
  h5: {
    fontSize: '1.75rem',
    fontWeight: 400,
    lineHeight: '2.25rem',
    letterSpacing: 0,
  },
  h6: {
    fontSize: '1.5rem',
    fontWeight: 400,
    lineHeight: '2rem',
    letterSpacing: 0,
  },
  subtitle1: {
    fontSize: '1.375rem',
    fontWeight: 400,
    lineHeight: '1.75rem',
    letterSpacing: 0,
  },
  subtitle2: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: '1.5rem',
    letterSpacing: '0.009375rem',
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: '1.5rem',
    letterSpacing: '0.03125rem',
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
    letterSpacing: '0.015625rem',
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    letterSpacing: '0.00625rem',
    textTransform: 'none',
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1rem',
    letterSpacing: '0.025rem',
  },
  overline: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    lineHeight: '1rem',
    letterSpacing: '0.03125rem',
    textTransform: 'none',
  },
}

/** Complete named MD3 type roles for custom TripFolio components. */
export const materialTypeScale = {
  displayLarge: materialTypography.h1,
  displayMedium: materialTypography.h2,
  displaySmall: materialTypography.h3,
  headlineLarge: materialTypography.h4,
  headlineMedium: materialTypography.h5,
  headlineSmall: materialTypography.h6,
  titleLarge: materialTypography.subtitle1,
  titleMedium: materialTypography.subtitle2,
  titleSmall: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    letterSpacing: '0.00625rem',
  },
  bodyLarge: materialTypography.body1,
  bodyMedium: materialTypography.body2,
  bodySmall: materialTypography.caption,
  labelLarge: materialTypography.button,
  labelMedium: {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    letterSpacing: '0.03125rem',
  },
  labelSmall: materialTypography.overline,
} as const

/**
 * Design Tokens for ShadowFinance
 * Generated from deterministic seed: sha256("ShadowFinance" + "sepolia" + "202412" + "ShadowFinance.sol")
 * Seed: 83d1cc6072e927098c21cdeb39f2f648a9d04f741a9f559f62df8fdcff13b2d3
 */

// Color palette extracted from seed
export const colors = {
  primary: '#83d1cc',      // Main brand color (teal-cyan)
  secondary: '#6072e9',    // Secondary accent (blue-purple)
  success: '#27f2f6',      // Success state (cyan)
  warning: '#48a9d0',      // Warning state (sky blue)
  error: '#f7419f',        // Error state (pink)
  
  // Light mode
  light: {
    background: '#f8f9fa',
    surface: '#ffffff',
    text: {
      primary: '#2d3748',
      secondary: '#4a5568',
      disabled: '#a0aec0',
    },
    border: '#e2e8f0',
    divider: '#cbd5e0',
  },
  
  // Dark mode
  dark: {
    background: '#1a1d2e',
    surface: '#252938',
    text: {
      primary: '#e2e8f0',
      secondary: '#cbd5e0',
      disabled: '#718096',
    },
    border: '#2d3748',
    divider: '#4a5568',
  },
} as const;

// Typography
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
    '3xl': '3rem',    // 48px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.6',
  },
} as const;

// Spacing system (4px base unit)
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
} as const;

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  full: '9999px',
} as const;

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 2px 8px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 16px rgba(0, 0, 0, 0.15)',
  none: 'none',
} as const;

// Transitions
export const transitions = {
  fast: '150ms ease-in-out',
  normal: '300ms ease-in-out',
  slow: '500ms ease-in-out',
} as const;

// Breakpoints (for responsive design)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

// Density configurations
export const density = {
  compact: {
    spacing: 0.75,  // -25%
    fontSize: -2,   // -2px
    lineHeight: 1.4,
  },
  comfortable: {
    spacing: 1.25,  // +25%
    fontSize: 2,    // +2px
    lineHeight: 1.6,
  },
} as const;

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: '2rem',     // 32px
      md: '2.5rem',   // 40px
      lg: '3rem',     // 48px
    },
    padding: {
      sm: '0.5rem 1rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem',
    },
    borderRadius: borderRadius.md,
  },
  card: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    shadow: shadows.md,
  },
  input: {
    height: '2.5rem',
    padding: '0.75rem 1rem',
    borderRadius: borderRadius.sm,
    borderWidth: '1px',
  },
  table: {
    cellPadding: spacing[4],
    rowHeight: '3rem',
  },
} as const;

// Accessibility
export const accessibility = {
  focusRing: {
    width: '2px',
    style: 'solid',
    offset: '2px',
  },
  minContrast: 4.5, // WCAG AA
} as const;

// Export theme configuration
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  breakpoints,
  density,
  components,
  accessibility,
} as const;

export type Theme = typeof theme;
export type ColorMode = 'light' | 'dark';





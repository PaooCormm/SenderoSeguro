// ─── SSEGURO Design Systeme ──────────────────────────────────────

export const COLORS = {
  // Brand
  primary:        '#8B1A1A',
  primaryLight:   '#C0392B',
  primaryDark:    '#5C0A0A',
  primaryGlow:    '#EF4444',
  primaryBg:      '#FEF2F2',
  primaryMuted:   '#FECACA',

  // Backgrounds (light)
  bgBase:         '#F8F9FC',
  bgSurface:      '#FFFFFF',
  bgCard:         '#FFFFFF',
  bgCardAlt:      '#F1F3F9',
  bgOverlay:      'rgba(139,26,26,0.06)',

  // Text
  textPrimary:    '#0F172A',
  textSecondary:  '#475569',
  textMuted:      '#94A3B8',
  textAccent:     '#8B1A1A',
  textOnPrimary:  '#FFFFFF',

  // Status
  statusOk:       '#16A34A',
  statusOkBg:     '#DCFCE7',
  statusWarn:     '#D97706',
  statusWarnBg:   '#FEF3C7',
  statusDanger:   '#DC2626',
  statusDangerBg: '#FEE2E2',
  statusInfo:     '#2563EB',
  statusInfoBg:   '#DBEAFE',

  // Borders
  border:         '#E2E8F0',
  borderStrong:   '#CBD5E1',
  borderFocus:    '#8B1A1A',

  // Mesh / network
  meshActive:     '#16A34A',
  meshInactive:   '#94A3B8',

  // Map
  markerSelf:     '#16A34A',
  markerAlert:    '#DC2626',
  markerOther:    '#D97706',
};

export const TYPOGRAPHY = {
  fontBold:     '700',
  fontSemibold: '600',
  fontMedium:   '500',
  fontRegular:  '400',
  xs:   10,
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   22,
  xxl:  28,
  xxxl: 36,
};

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   28,
  xxl:  40,
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

export const SHADOW = {
  card: {
    shadowColor:   '#1E293B',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     3,
  },
  panel: {
    shadowColor:   '#1E293B',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius:  16,
    elevation:     6,
  },
  panic: {
    shadowColor:   '#8B1A1A',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius:  16,
    elevation:     10,
  },
};

export const ESCOM_REGION = {
  latitude:       19.5046,
  longitude:     -99.1465,
  latitudeDelta:   0.008,
  longitudeDelta:  0.008,
};
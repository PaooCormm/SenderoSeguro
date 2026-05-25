/**
 * UIElements
 * StatusBadge, StatCard, AlertCard, LogLine, SectionHeader, Divider
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOW } from '../constants/theme';

// ─── StatusBadge ─────────────────────────────────────────────────────────────
export function StatusBadge({ ready, starting }) {
  const label = starting ? 'Iniciando…' : ready ? 'Red Activa' : 'Sin red';
  const color = starting ? COLORS.statusWarn : ready ? COLORS.statusOk : COLORS.textMuted;
  const bg    = starting ? COLORS.statusWarnBg : ready ? COLORS.statusOkBg : COLORS.bgCardAlt;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, accent, small }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          accent && { color: COLORS.primary },
          small && { fontSize: TYPOGRAPHY.md },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

// ─── AlertCard ───────────────────────────────────────────────────────────────
export function AlertCard({ alert }) {
  const time = new Date(alert.timestamp).toLocaleTimeString('es-MX', {
    hour:   '2-digit',
    minute: '2-digit',
  });
  const hasLoc = !!alert?.location?.latitude;

  return (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={styles.alertBadge}>
          <Text style={styles.alertBadgeText}>🆘 PÁNICO</Text>
        </View>
        <Text style={styles.alertTime}>{time}</Text>
      </View>
      <Text style={styles.alertFrom} numberOfLines={1}>
        Origen: {alert.from}
      </Text>
      {hasLoc && (
        <Text style={styles.alertCoords}>
          {alert.location.latitude.toFixed(5)}, {alert.location.longitude.toFixed(5)}
          {'  ·  '}
          {alert.location.source === 'fresh' ? 'GPS directo' : 'Última conocida'}
        </Text>
      )}
      {!hasLoc && (
        <Text style={styles.alertNoLoc}>Sin coordenadas</Text>
      )}
    </View>
  );
}

// ─── LogLine ─────────────────────────────────────────────────────────────────
export function LogLine({ line }) {
  const isPanic = line.includes('🆘');
  const isError = line.toLowerCase().includes('error');
  const color   = isPanic
    ? COLORS.statusDanger
    : isError
    ? COLORS.statusWarn
    : COLORS.textSecondary;

  return (
    <Text style={[styles.logLine, { color }]} numberOfLines={2}>
      {line}
    </Text>
  );
}

// ─── SectionHeader ───────────────────────────────────────────────────────────
export function SectionHeader({ title, badge }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {badge != null && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

// ─── CampusStatusCard ─────────────────────────────────────────────────────────
export function CampusStatusCard({ level = 1, coverage = 92 }) {
  const levelLabel  = level === 1 ? 'NIVEL 1: SEGURO' : level === 2 ? 'NIVEL 2: ALERTA' : 'NIVEL 3: CRÍTICO';
  const levelColor  = level === 1 ? COLORS.statusOk : level === 2 ? COLORS.statusWarn : COLORS.statusDanger;
  const levelBg     = level === 1 ? COLORS.statusOkBg : level === 2 ? COLORS.statusWarnBg : COLORS.statusDangerBg;

  return (
    <View style={styles.campusCard}>
      <Text style={styles.campusTitle}>Estado del Campus</Text>
      <View style={[styles.levelBadge, { backgroundColor: levelBg }]}>
        <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
        <Text style={[styles.levelText, { color: levelColor }]}>{levelLabel}</Text>
      </View>
      <Text style={styles.campusCoverage}>
        <Text style={styles.campusPct}>{coverage}%</Text> Zonas bajo vigilancia activa
      </Text>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${coverage}%`, backgroundColor: levelColor }]} />
      </View>
    </View>
  );
}

// ─── ReportItem ──────────────────────────────────────────────────────────────
export function ReportItem({ icon, title, time, location, dot }) {
  return (
    <View style={styles.reportItem}>
      <View style={[styles.reportIcon, { backgroundColor: `${COLORS.textMuted}18` }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={styles.reportBody}>
        <View style={styles.reportRow}>
          <Text style={styles.reportTitle} numberOfLines={1}>{title}</Text>
          {dot && <View style={[styles.reportDot, { backgroundColor: dot }]} />}
        </View>
        <Text style={styles.reportMeta}>{time} · {location}</Text>
      </View>
    </View>
  );
}

// ─── CommunityCard ───────────────────────────────────────────────────────────
export function CommunityCard({ count }) {
  return (
    <View style={styles.communityCard}>
      <Text style={styles.communityIcon}>👥</Text>
      <Text style={styles.communityLabel}>Comunidad{'\n'}USUARIOS ACTIVOS AHORA</Text>
      <Text style={styles.communityCount}>{count.toLocaleString('es-MX')}</Text>
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider() {
  return <View style={styles.divider} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // StatusBadge
  badge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
  },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize:  TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontSemibold,
    letterSpacing: 0.3,
  },

  // StatCard
  statCard: {
    flex:            1,
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    alignItems:      'center',
    ...SHADOW.card,
  },
  statLabel: {
    color:         COLORS.textMuted,
    fontSize:      TYPOGRAPHY.xs,
    fontWeight:    TYPOGRAPHY.fontMedium,
    marginBottom:  SPACING.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    color:      COLORS.textPrimary,
    fontSize:   TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.fontBold,
  },

  // AlertCard
  alertCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.statusDanger,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  alertHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   SPACING.xs,
  },
  alertBadge: {
    backgroundColor: COLORS.statusDangerBg,
    borderRadius:    RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   2,
  },
  alertBadgeText: {
    color:      COLORS.statusDanger,
    fontSize:   TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.fontBold,
    letterSpacing: 0.5,
  },
  alertTime: {
    color:    COLORS.textMuted,
    fontSize: TYPOGRAPHY.xs,
  },
  alertFrom: {
    color:        COLORS.textPrimary,
    fontSize:     TYPOGRAPHY.sm,
    fontWeight:   TYPOGRAPHY.fontMedium,
    fontFamily:   'monospace',
    marginBottom: 2,
  },
  alertCoords: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.xs,
    fontFamily: 'monospace',
  },
  alertNoLoc: {
    color:     COLORS.textMuted,
    fontSize:  TYPOGRAPHY.xs,
    fontStyle: 'italic',
  },

  // LogLine
  logLine: {
    fontSize:     TYPOGRAPHY.xs,
    fontFamily:   'monospace',
    marginBottom: 3,
    lineHeight:   16,
  },

  // SectionHeader
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   SPACING.sm,
    gap:            SPACING.sm,
  },
  sectionTitle: {
    color:         COLORS.textSecondary,
    fontSize:      TYPOGRAPHY.sm,
    fontWeight:    TYPOGRAPHY.fontBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionBadge: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius:    RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   2,
  },
  sectionBadgeText: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.fontSemibold,
  },

  // CampusStatusCard
  campusCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    flex:            1,
    borderWidth:     1,
    borderColor:     COLORS.border,
    ...SHADOW.card,
  },
  campusTitle: {
    fontSize:    TYPOGRAPHY.sm,
    fontWeight:  TYPOGRAPHY.fontSemibold,
    color:       COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  levelBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   SPACING.xs,
    alignSelf:         'flex-start',
    marginBottom:      SPACING.md,
  },
  levelDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  levelText: {
    fontSize:  TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.fontBold,
    letterSpacing: 0.5,
  },
  campusCoverage: {
    color:        COLORS.textSecondary,
    fontSize:     TYPOGRAPHY.xs,
    marginBottom: SPACING.sm,
  },
  campusPct: {
    fontSize:   TYPOGRAPHY.xxl,
    fontWeight: TYPOGRAPHY.fontBold,
    color:      COLORS.textPrimary,
  },
  progressBg: {
    height:          6,
    backgroundColor: COLORS.border,
    borderRadius:    RADIUS.full,
    overflow:        'hidden',
  },
  progressFill: {
    height:       6,
    borderRadius: RADIUS.full,
  },

  // ReportItem
  reportItem: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  reportIcon: {
    width:           36,
    height:          36,
    borderRadius:    RADIUS.sm,
    alignItems:      'center',
    justifyContent:  'center',
  },
  reportBody: {
    flex: 1,
  },
  reportRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  reportTitle: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontMedium,
    color:      COLORS.textPrimary,
    flex:       1,
  },
  reportDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    marginLeft:   SPACING.xs,
  },
  reportMeta: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textMuted,
    marginTop: 2,
  },

  // CommunityCard
  communityCard: {
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    alignItems:      'center',
    justifyContent:  'center',
    flex:            1,
    minWidth:        120,
    ...SHADOW.panic,
  },
  communityIcon: {
    fontSize:     20,
    marginBottom: SPACING.xs,
  },
  communityLabel: {
    color:      'rgba(255,255,255,0.75)',
    fontSize:   TYPOGRAPHY.xs,
    textAlign:  'center',
    fontWeight: TYPOGRAPHY.fontMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight:  14,
    marginBottom: SPACING.xs,
  },
  communityCount: {
    color:      '#FFF',
    fontSize:   TYPOGRAPHY.xxl,
    fontWeight: TYPOGRAPHY.fontBold,
  },

  // Divider
  divider: {
    height:          1,
    backgroundColor: COLORS.border,
    marginVertical:  SPACING.md,
  },
});
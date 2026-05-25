/**
 * Sidebar
 * Panel lateral de navegación estilo dashboard
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOW } from '../constants/theme';

const NAV_ITEMS = [
  { id: 'map',      icon: '🗺',  label: 'Inicio / Mapa de Calor' },
  { id: 'feed',     icon: '💬',  label: 'Feed Comunitario'       },
  { id: 'report',   icon: '📝',  label: 'Redactar Reporte'       },
  { id: 'stats',    icon: '📊',  label: 'Estadísticas (Admin)'   },
  { id: 'heatmap', icon: '🔥', label: 'Mapa de Calor' },
];

export function Sidebar({ activeSection, onSectionChange, user, guestMode }) {
  const { logout } = useAuth();

  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <View style={styles.logo}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>SS</Text>
        </View>
        <View>
          <Text style={styles.logoName}>Sendero Seguro</Text>
          <Text style={styles.logoSub}>Protección Académica</Text>
        </View>
      </View>

      {/* Nav */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          // Estadísticas solo para admin/autenticados
          if (item.id === 'stats' && guestMode) return null;

          const active = activeSection === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => onSectionChange(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* SOS rápido */}
      {!guestMode && (
        <View style={styles.sosPad}>
          <TouchableOpacity
            style={styles.sosBtn}
            onPress={() => onSectionChange('map')}
            activeOpacity={0.85}
          >
            <Text style={styles.sosBtnText}>🆘 EMERGENCIA SOS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User / Cerrar sesión */}
      <View style={styles.footer}>
        {guestMode ? (
          <View style={styles.guestTag}>
            <Text style={styles.guestTagText}>👤 Modo Invitado</Text>
          </View>
        ) : (
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.nombre?.charAt(0) ?? 'E'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{user?.nombre ?? 'Estudiante'}</Text>
              <Text style={styles.userBoleta} numberOfLines={1}>{user?.boleta ?? ''}</Text>
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>↩ Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width:           200,
    backgroundColor: COLORS.bgSurface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    flexDirection:   'column',
    ...SHADOW.card,
  },

  // Logo
  logo: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.lg,
    paddingBottom:     SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logoMark: {
    width:           38,
    height:          38,
    borderRadius:    RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  logoMarkText: {
    color:      '#FFF',
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontBold,
    letterSpacing: 1,
  },
  logoName: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontBold,
    color:      COLORS.textPrimary,
  },
  logoSub: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textMuted,
  },

  // Nav
  nav: {
    flex:          1,
    paddingTop:    SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  navItem: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.md,
    borderRadius:      RADIUS.md,
    marginBottom:      2,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  navIcon: {
    fontSize: 16,
  },
  navLabel: {
    fontSize:   TYPOGRAPHY.sm,
    color:      COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontMedium,
    flex:       1,
  },
  navLabelActive: {
    color:      COLORS.primary,
    fontWeight: TYPOGRAPHY.fontSemibold,
  },

  // SOS pad
  sosPad: {
    padding: SPACING.md,
  },
  sosBtn: {
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems:      'center',
  },
  sosBtnText: {
    color:         '#FFF',
    fontSize:      TYPOGRAPHY.xs,
    fontWeight:    TYPOGRAPHY.fontBold,
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding:        SPACING.md,
    gap:            SPACING.sm,
  },
  guestTag: {
    backgroundColor: COLORS.statusWarnBg,
    borderRadius:    RADIUS.sm,
    padding:         SPACING.sm,
  },
  guestTagText: {
    color:      '#92400E',
    fontSize:   TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.fontSemibold,
    textAlign:  'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
  },
  avatar: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: COLORS.primaryBg,
    borderWidth:     1,
    borderColor:     COLORS.primaryMuted,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontBold,
    color:      COLORS.primary,
  },
  userName: {
    fontSize:   TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.fontSemibold,
    color:      COLORS.textPrimary,
  },
  userBoleta: {
    fontSize:   TYPOGRAPHY.xs,
    color:      COLORS.textMuted,
    fontFamily: 'monospace',
  },
  logoutBtn: {
    paddingVertical: SPACING.xs,
  },
  logoutText: {
    color:    COLORS.textMuted,
    fontSize: TYPOGRAPHY.xs,
  },
});
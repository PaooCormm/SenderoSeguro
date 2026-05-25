/**
 * GuestBanner
 * Banner persistente para modo invitado que muestra
 * las restricciones y un botón para iniciar sesión.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

export function GuestBanner({ onLoginPress }) {
  const { logout } = useAuth();

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Text style={styles.icon}>👤</Text>
        <View>
          <Text style={styles.title}>Modo Invitado</Text>
          <Text style={styles.sub}>
            Alertas SOS y reportes deshabilitados
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={onLoginPress ?? logout}
        activeOpacity={0.8}
      >
        <Text style={styles.loginBtnText}>Ingresar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.statusWarnBg,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical:   SPACING.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    flex:          1,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontBold,
    color:      '#92400E',
  },
  sub: {
    fontSize: TYPOGRAPHY.xs,
    color:    '#B45309',
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
  },
  loginBtnText: {
    color:      '#FFF',
    fontSize:   TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.fontBold,
  },
});
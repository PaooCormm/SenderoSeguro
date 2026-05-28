/**
 * GuestBanner
 * Banner persistente para modo invitado que muestra
 * las restricciones y un botón para iniciar sesión.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

export function GuestBanner({ onLoginPress }) {
  const { logout } = useAuth();
  const { width, height } = useWindowDimensions();
  const compact = width < 360 || height < 700;

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Text style={styles.icon}>👤</Text>
        <View>
          <Text style={styles.title}>Modo Invitado</Text>
          {!compact && (
            <Text style={styles.sub}>
              Alertas SOS y reportes deshabilitados
            </Text>
          )}
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
    paddingHorizontal: SPACING.sm,
    paddingVertical:   6,
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    flex:          1,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    fontSize:   TYPOGRAPHY.xs - 1,
    fontWeight: TYPOGRAPHY.fontBold,
    color:      '#92400E',
  },
  sub: {
    fontSize: TYPOGRAPHY.xs - 2,
    color:    '#B45309',
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical:   4,
  },
  loginBtnText: {
    color:      '#FFF',
    fontSize:   TYPOGRAPHY.xs - 1,
    fontWeight: TYPOGRAPHY.fontBold,
  },
});

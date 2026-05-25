/**
 * PanicButton
 * Botón SOS con animación de pulso. En modo invitado se muestra bloqueado.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOW } from '../constants/theme';

export function PanicButton({ onPress, disabled, sent, guestMode }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (disabled || sent || guestMode) {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1000, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [disabled, sent, guestMode, pulse]);

  const bgColor     = sent       ? COLORS.statusOk
                    : guestMode  ? COLORS.bgCardAlt
                    : disabled   ? '#E2E8F0'
                    : COLORS.primary;
  const borderColor = sent       ? COLORS.statusOk
                    : guestMode  ? COLORS.borderStrong
                    : disabled   ? COLORS.border
                    : COLORS.primaryLight;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: pulse }] }]}>
      {!disabled && !sent && !guestMode && (
        <View style={styles.halo} />
      )}

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: bgColor, borderColor },
          (disabled || guestMode) && styles.disabled,
          !disabled && !sent && !guestMode && SHADOW.panic,
        ]}
        onPress={guestMode ? undefined : onPress}
        disabled={disabled || sent || guestMode}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>
          {sent ? '✓' : guestMode ? '🔒' : '🆘'}
        </Text>
        <Text style={[styles.label, (sent || guestMode) && styles.labelDark]}>
          {sent       ? 'ALERTA ENVIADA'
           : guestMode? 'FUNCIÓN BLOQUEADA'
           : disabled ? 'CONECTANDO…'
           :            'EMITIR ALERTA DE AUXILIO'}
        </Text>
        <Text style={[styles.sublabel, (sent || guestMode) && styles.sublabelDark]}>
          {sent       ? 'Tu ubicación fue compartida'
           : guestMode? 'Inicia sesión para usar esta función'
           : disabled ? 'Espera mientras la red se inicializa'
           :            'Se enviará tu ubicación a Seguridad y contactos'}
        </Text>

        {/* Ícono de wifi/mesh animado */}
        {!disabled && !sent && !guestMode && (
          <View style={styles.meshIcon}>
            <Text style={styles.meshIconText}>📡</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position:      'relative',
    marginVertical: SPACING.md,
  },
  halo: {
    position:        'absolute',
    inset:           -8,
    borderRadius:    RADIUS.xl + 8,
    backgroundColor: `${COLORS.primary}12`,
    borderWidth:     1,
    borderColor:     `${COLORS.primary}25`,
  },
  button: {
    borderRadius:      RADIUS.xl,
    paddingVertical:   SPACING.xl,
    paddingHorizontal: SPACING.base,
    alignItems:        'center',
    justifyContent:    'center',
    borderWidth:       1.5,
    gap:               4,
  },
  disabled: {
    opacity: 0.55,
  },
  icon: {
    fontSize:     32,
    marginBottom: SPACING.xs,
  },
  label: {
    color:         COLORS.textOnPrimary,
    fontSize:      TYPOGRAPHY.lg,
    fontWeight:    TYPOGRAPHY.fontBold,
    letterSpacing: 1.5,
  },
  labelDark: {
    color: COLORS.textSecondary,
  },
  sublabel: {
    color:     'rgba(255,255,255,0.75)',
    fontSize:  TYPOGRAPHY.sm,
    marginTop: 2,
    textAlign: 'center',
  },
  sublabelDark: {
    color: COLORS.textMuted,
  },
  meshIcon: {
    position: 'absolute',
    top:      SPACING.md,
    right:    SPACING.md,
    opacity:  0.6,
  },
  meshIconText: {
    fontSize: 18,
  },
});
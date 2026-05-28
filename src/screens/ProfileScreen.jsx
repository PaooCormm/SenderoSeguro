/**
 * src/screens/ProfileScreen.jsx
 *
 * Pantalla de perfil de usuario.
 * Secciones:
 *   - Avatar / nombre / boleta / rol
 *   - Estadísticas personales (reportes, alertas, votos)
 *   - Edición de nombre
 *   - Preferencias (notificaciones, privacidad, ubicación)
 *   - Información de red Mesh
 *   - Cerrar sesión / acciones de cuenta
 *
 * Correcciones respecto a versión anterior:
 *   - COLORS.borderFocus → COLORS.primary  (no existe en theme)
 *   - SHADOW.panel       → SHADOW.card     (no existe en theme)
 *   - Todos los tokens usan solo los definidos en constants/theme.js
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOW } from '../constants/theme';
import api from '../services/api';

// ─── SectionCard ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children, style }) {
  return (
    <View style={[cardSt.card, style]}>
      {title && (
        <View style={cardSt.header}>
          {icon && (
            <MaterialIcons name={icon} size={16} color={COLORS.textMuted} />
          )}
          <Text style={cardSt.title}>{title}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const cardSt = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.lg,
    borderWidth:     1,
    borderColor:     COLORS.border,
    marginBottom:    SPACING.md,
    overflow:        'hidden',
    ...SHADOW.card,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.xs,
    paddingHorizontal: SPACING.base,
    paddingTop:        SPACING.md,
    paddingBottom:     SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize:      TYPOGRAPHY.xs,
    fontWeight:    TYPOGRAPHY.fontBold,
    color:         COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[rowSt.row, last && rowSt.rowLast]}>
      <MaterialIcons name={icon} size={16} color={COLORS.textMuted} style={rowSt.icon} />
      <Text style={rowSt.label}>{label}</Text>
      <Text style={rowSt.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const rowSt = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: SPACING.base,
    paddingVertical:   SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap:               SPACING.sm,
  },
  rowLast: { borderBottomWidth: 0 },
  icon:    { flexShrink: 0 },
  label: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sm,
    width:      90,
    flexShrink: 0,
  },
  value: {
    color:      COLORS.textPrimary,
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontMedium,
    flex:       1,
    textAlign:  'right',
  },
});

// ─── PrefRow ──────────────────────────────────────────────────────────────────
function PrefRow({ icon, label, description, value, onChange, last }) {
  return (
    <View style={[prefSt.row, last && prefSt.rowLast]}>
      <View style={prefSt.iconWrap}>
        <MaterialIcons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={prefSt.text}>
        <Text style={prefSt.label}>{label}</Text>
        {description && <Text style={prefSt.desc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
        thumbColor={value ? COLORS.primary : COLORS.bgCardAlt}
      />
    </View>
  );
}

const prefSt = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: SPACING.base,
    paddingVertical:   SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap:               SPACING.sm,
  },
  rowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width:           34,
    height:          34,
    borderRadius:    RADIUS.sm,
    backgroundColor: COLORS.primaryBg,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  text:  { flex: 1 },
  label: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontMedium,
    color:      COLORS.textPrimary,
  },
  desc: {
    fontSize:  TYPOGRAPHY.xs,
    color:     COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});

// ─── ActionRow ────────────────────────────────────────────────────────────────
function ActionRow({ icon, label, color, onPress, last }) {
  const c = color ?? COLORS.textSecondary;
  return (
    <TouchableOpacity
      style={[actSt.row, last && actSt.rowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons name={icon} size={18} color={c} />
      <Text style={[actSt.label, { color: c }]}>{label}</Text>
      <MaterialIcons name="chevron-right" size={18} color={c} style={{ opacity: 0.5 }} />
    </TouchableOpacity>
  );
}

const actSt = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical:   SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLast: { borderBottomWidth: 0 },
  label: {
    flex:       1,
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontMedium,
  },
});

// ─── Modal de cambio de contraseña ───────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reqCurrentOk = currentPassword.trim().length > 0;
  const reqLengthOk = newPassword.trim().length >= 8;
  const reqMatchOk = newPassword.length > 0 && newPassword === confirmPassword;
  const isValid = reqCurrentOk && reqLengthOk && reqMatchOk;

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose?.();
  };

  const handleSave = async () => {
    if (!isValid) {
      if (newPassword.trim().length < 8) {
        setError('La nueva contraseña debe tener al menos 8 caracteres.');
      } else if (newPassword !== confirmPassword) {
        setError('La confirmación no coincide.');
      } else {
        setError('Completa todos los campos.');
      }
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.cambiarPassword(currentPassword, newPassword);
      Alert.alert('Listo', 'Contraseña actualizada.');
      handleClose();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={editSt.overlay}>
      <View style={editSt.card}>
        <Text style={editSt.title}>Cambiar contraseña</Text>
        <TextInput
          style={editSt.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Contraseña actual"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          style={editSt.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nueva contraseña"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          style={editSt.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirmar nueva contraseña"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          autoCapitalize="none"
        />
        <View style={editSt.requirements}>
          <View style={editSt.requirementRow}>
            <View style={[editSt.reqDot, { backgroundColor: reqCurrentOk ? COLORS.statusOk : COLORS.statusWarn }]} />
            <Text style={[editSt.reqText, { color: reqCurrentOk ? COLORS.statusOk : COLORS.textSecondary }]}
            >Contraseña actual requerida</Text>
          </View>
          <View style={editSt.requirementRow}>
            <View style={[editSt.reqDot, { backgroundColor: reqLengthOk ? COLORS.statusOk : COLORS.statusWarn }]} />
            <Text style={[editSt.reqText, { color: reqLengthOk ? COLORS.statusOk : COLORS.textSecondary }]}
            >Nueva contraseña mínimo 8 caracteres</Text>
          </View>
          <View style={editSt.requirementRow}>
            <View style={[editSt.reqDot, { backgroundColor: reqMatchOk ? COLORS.statusOk : COLORS.statusWarn }]} />
            <Text style={[editSt.reqText, { color: reqMatchOk ? COLORS.statusOk : COLORS.textSecondary }]}
            >Nueva contraseña y confirmación iguales</Text>
          </View>
        </View>
        {error !== '' && (
          <Text style={editSt.hint}>{error}</Text>
        )}
        <View style={editSt.actions}>
          <TouchableOpacity style={editSt.cancelBtn} onPress={handleClose}>
            <Text style={editSt.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[editSt.saveBtn, !isValid && editSt.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isValid || saving}
          >
            <Text style={editSt.saveText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const editSt = StyleSheet.create({
  overlay: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          100,
    padding:         SPACING.base,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.xl,
    width:           '100%',
    maxWidth:        360,
    ...SHADOW.card,
  },
  title: {
    fontSize:     TYPOGRAPHY.lg,
    fontWeight:   TYPOGRAPHY.fontBold,
    color:        COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  input: {
    borderWidth:       1.5,
    borderColor:       COLORS.primary,
    borderRadius:      RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.md,
    fontSize:          TYPOGRAPHY.base,
    color:             COLORS.textPrimary,
    backgroundColor:   COLORS.bgCard,
    marginBottom:      SPACING.xs,
  },
  requirements: {
    marginTop:    SPACING.xs,
    marginBottom: SPACING.sm,
    gap:          6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.xs,
  },
  reqDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  reqText: {
    fontSize: TYPOGRAPHY.xs,
  },
  hint: {
    fontSize:     TYPOGRAPHY.xs,
    color:        COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  actions: {
    flexDirection: 'row',
    gap:           SPACING.sm,
    marginTop:     SPACING.md,
  },
  cancelBtn: {
    flex:            1,
    borderWidth:     1,
    borderColor:     COLORS.border,
    borderRadius:    RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems:      'center',
  },
  cancelText: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontSemibold,
  },
  saveBtn: {
    flex:            2,
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems:      'center',
    ...SHADOW.panic,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: {
    color:      '#FFF',
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontBold,
  },
});

// ─── ProfileScreen ────────────────────────────────────────────────────────────
export function ProfileScreen({ meshNodeId, meshReady }) {
  const { user, logout, guestMode, setUser } = useAuth();
  const { width, height } = useWindowDimensions();
  const compactGuest = width < 360 || height < 700;
  const [stats, setStats] = useState({ reportes: 0, alertas: 0, votos: 0, confirmadas: 0 });

  const [notifAlertas,  setNotifAlertas ] = useState(true);
  const [notifFeed,     setNotifFeed    ] = useState(true);
  const [modoAnonimo,   setModoAnonimo  ] = useState(false);
  const [ubicacionAuto, setUbicacionAuto] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!guestMode) {
      api.me().then(res => {
        // Suponiendo que el backend devuelve un objeto con stats o reportes
        setStats({
          reportes: res.stats?.totalReportes ?? 0,
          alertas: res.stats?.totalAlertas ?? 0,
          votos: res.stats?.totalVotos ?? 0,
          confirmadas: res.stats?.totalConfirmadas ?? 0,
        });
      }).catch(() => {});
    }
  }, [guestMode]);


  const handleLogout = useCallback(() => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
      ],
    );
  }, [logout]);

  const displayName = user?.nombre ?? user?.nombre_completo ?? 'Estudiante';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const joinDate = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long',
  });

  // Correo: puede venir como .correo o .correo_inst dependiendo del campo del servidor
  const correoDisplay = user?.correo
    ?? user?.correo_inst
    ?? (user?.boleta ? `${user.boleta}@alumno.ipn.mx` : '—');

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Banner invitado ── */}
        {guestMode && (
          <View style={styles.guestBanner}>
            <MaterialIcons name="info-outline" size={18} color="#92400E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.guestBannerTitle}>Modo Invitado</Text>
              {!compactGuest && (
                <Text style={styles.guestBannerSub}>
                  Inicia sesión para ver tu perfil completo y acceder a todas las funciones.
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.guestBannerBtn} onPress={logout}>
              <Text style={styles.guestBannerBtnText}>Ingresar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Hero ── */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{guestMode ? '?' : initials}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>
            {guestMode ? 'Invitado' : displayName}
          </Text>
          <Text style={styles.heroBoleta}>{user?.boleta ?? '—'}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.roleBadge, guestMode && styles.roleBadgeGuest]}>
              <MaterialIcons
                name={guestMode ? 'person-outline' : 'verified-user'}
                size={12}
                color={guestMode ? '#92400E' : COLORS.primary}
              />
              <Text style={[styles.roleBadgeText, guestMode && styles.roleBadgeTextGuest]}>
                {guestMode ? 'Invitado' : (user?.role === 'admin' ? 'Administrador' : 'Estudiante ESCOM')}
              </Text>
            </View>
            {!guestMode && (
              <View style={styles.ipnBadge}>
                <Text style={styles.ipnBadgeText}>IPN · Zacatenco</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Estadísticas ── */}
        {!guestMode && (
          <View style={styles.statsRow}>
            {[
              { label: 'Reportes', value: stats.reportes, icon: 'description' },
              { label: 'Alertas SOS', value: stats.alertas, icon: 'crisis-alert' },
              { label: 'Votos dados', value: stats.votos, icon: 'thumb-up-alt' },
              { label: 'Confirmadas', value: stats.confirmadas, icon: 'check-circle' },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <MaterialIcons name={stat.icon} size={18} color={COLORS.primary} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Datos de cuenta ── */}
        <SectionCard title="Información de cuenta" icon="account-circle">
          <InfoRow icon="person"         label="Nombre"        value={guestMode ? 'Sin cuenta' : displayName} />
          <InfoRow icon="school"         label="Boleta"        value={user?.boleta ?? '—'} />
          <InfoRow icon="mail"           label="Correo"        value={guestMode ? '—' : correoDisplay} />
          <InfoRow icon="verified-user"  label="Rol"           value={guestMode ? 'Invitado' : (user?.role === 'admin' ? 'Administrador' : 'Estudiante')} />
          <InfoRow icon="calendar-today" label="Miembro desde" value={guestMode ? '—' : joinDate} last />
        </SectionCard>

        {/* ── Preferencias ── */}
        <SectionCard title="Preferencias" icon="tune">
          <PrefRow
            icon="notifications-active"
            label="Alertas de pánico"
            description="Recibe notificaciones cuando alguien emita SOS cerca de ti"
            value={notifAlertas}
            onChange={setNotifAlertas}
          />
          <PrefRow
            icon="forum"
            label="Notificaciones del feed"
            description="Nuevos reportes en el campus"
            value={notifFeed}
            onChange={setNotifFeed}
          />
          <PrefRow
            icon="location-on"
            label="Ubicación automática"
            description="Incluir GPS al emitir alertas SOS"
            value={ubicacionAuto}
            onChange={setUbicacionAuto}
          />
          <PrefRow
            icon="visibility-off"
            label="Reportar anónimamente"
            description="Tus reportes no mostrarán tu nombre por defecto"
            value={modoAnonimo}
            onChange={setModoAnonimo}
            last
          />
        </SectionCard>

        {/* ── Red Mesh ── */}
        <SectionCard title="Red Mesh" icon="wifi-tethering">
          <InfoRow icon="router"           label="Node ID"    value={meshNodeId ?? 'Sin inicializar'} />
          <InfoRow icon="signal-wifi-4-bar" label="Estado"   value={meshReady ? 'Activa' : 'Sin conexión'} />
          <InfoRow icon="devices"          label="Protocolo" value="Nearby Connections API" last />
        </SectionCard>

        {/* ── Acciones ── */}
        <SectionCard title="Cuenta" icon="manage-accounts">
          {!guestMode && (
            <ActionRow
              icon="lock-reset"
              label="Cambiar contraseña"
              onPress={() => setChangingPassword(true)}
            />
          )}
          <ActionRow
            icon="shield"
            label="Aviso de privacidad"
            onPress={() => Alert.alert('Privacidad', 'SSEGURO es un sistema institucional de ESCOM-IPN. Tus datos son tratados conforme a la política de privacidad del IPN.')}
          />
          <ActionRow
            icon="info-outline"
            label="Acerca de SSEGURO"
            onPress={() => Alert.alert('SSEGURO v1.0', 'Sistema de Seguridad Comunitaria\nESCOM · IPN · Unidad Zacatenco\n\nDesarrollado como proyecto local.')}
          />
          <ActionRow
            icon="logout"
            label={guestMode ? 'Iniciar sesión' : 'Cerrar sesión'}
            color={COLORS.statusDanger}
            onPress={handleLogout}
            last
          />
        </SectionCard>

        <Text style={styles.version}>
          SSEGURO v1.0 · ESCOM IPN · {new Date().getFullYear()}
        </Text>
      </ScrollView>

      {/* Modal cambio de contraseña */}
      {changingPassword && (
        <ChangePasswordModal onClose={() => setChangingPassword(false)} />
      )}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.bgBase },
  content: { padding: SPACING.base, paddingBottom: SPACING.xxl },

  guestBanner: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius:    RADIUS.lg,
    padding:         SPACING.xs,
    marginBottom:    SPACING.md,
    gap:             SPACING.sm,
    borderWidth:     1,
    borderColor:     '#FDE68A',
  },
  guestBannerTitle:   { fontSize: TYPOGRAPHY.xs - 1, fontWeight: TYPOGRAPHY.fontBold, color: '#92400E' },
  guestBannerSub:     { fontSize: TYPOGRAPHY.xs - 2, color: '#B45309', lineHeight: 12 },
  guestBannerBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
                        paddingHorizontal: SPACING.xs, paddingVertical: 4,
                        alignSelf: 'flex-start' },
  guestBannerBtnText: { color: '#FFF', fontSize: TYPOGRAPHY.xs - 1, fontWeight: TYPOGRAPHY.fontBold },

  heroCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.xl,
    alignItems:      'center',
    marginBottom:    SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    ...SHADOW.card,
  },
  avatarWrap:     { position: 'relative', marginBottom: SPACING.md },
  avatar: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     3,
    borderColor:     COLORS.primaryMuted,
  },
  avatarInitials: { color: '#FFF', fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.fontBold, letterSpacing: 1 },
  avatarEditBtn: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    width:           26,
    height:          26,
    borderRadius:    13,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    borderColor:     COLORS.bgCard,
  },
  heroName:   { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.fontBold, color: COLORS.textPrimary, marginBottom: 4, textAlign: 'center' },
  heroBoleta: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, fontFamily: 'monospace', marginBottom: SPACING.md, letterSpacing: 0.5 },
  heroBadgeRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap', justifyContent: 'center' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.primaryMuted,
  },
  roleBadgeGuest:     { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  roleBadgeText:      { color: COLORS.primary, fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.fontSemibold },
  roleBadgeTextGuest: { color: '#92400E' },
  ipnBadge: {
    backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  ipnBadgeText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.fontMedium },

  statsRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', gap: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card,
  },
  statValue: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.fontBold, color: COLORS.textPrimary },
  statLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 14 },

  version: { textAlign: 'center', color: COLORS.textMuted, fontSize: TYPOGRAPHY.xs, marginTop: SPACING.sm, letterSpacing: 0.4 },
});

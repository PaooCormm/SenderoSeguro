/**
 * src/screens/LoginScreen.jsx
 *
 * Login + Registro contra la API REST.
 * - Validación por campo con errores inline
 * - Barra de fortaleza de contraseña
 * - Shake animation en errores
 * - Recuperación de contraseña
 * - Modo invitado
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOW } from '../constants/theme';

// ─── Expresiones regulares ────────────────────────────────────────────────────
const BOLETA_RE = /^\d{10}$/;
const EMAIL_RE  = /^[^\s@]+@(alumno\.ipn\.mx|ipn\.mx)$/i;
const PASS_RE   = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const NOMBRE_RE = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]{2,}$/i;

// ─── Validaciones ─────────────────────────────────────────────────────────────
function validateLogin(boleta, password) {
  const e = {};
  if (!boleta.trim())
    e.boleta = 'Ingresa tu boleta o correo.';
  else if (!BOLETA_RE.test(boleta.trim()) && !EMAIL_RE.test(boleta.trim()))
    e.boleta = 'Boleta (10 dígitos) o correo @alumno.ipn.mx';
  if (!password)
    e.password = 'Ingresa tu contraseña.';
  return e;
}

function validateRegister(nombre, apellido, boleta, correo, pass, passConf) {
  const e = {};
  if (!nombre.trim())
    e.nombre = 'Ingresa tu(s) nombre(s).';
  else if (!NOMBRE_RE.test(nombre))
    e.nombre = 'Solo letras, mínimo 2 caracteres.';
  if (!apellido.trim())
    e.apellido = 'Ingresa tus apellidos.';
  else if (!NOMBRE_RE.test(apellido))
    e.apellido = 'Solo letras, mínimo 2 caracteres.';
  if (!boleta.trim())
    e.boleta = 'Ingresa tu número de boleta.';
  else if (!BOLETA_RE.test(boleta))
    e.boleta = 'La boleta debe tener exactamente 10 dígitos.';
  if (!correo.trim())
    e.correo = 'Ingresa tu correo institucional.';
  else if (!EMAIL_RE.test(correo))
    e.correo = 'Debe ser @alumno.ipn.mx o @ipn.mx';
  if (!pass)
    e.pass = 'Crea una contraseña.';
  else if (!PASS_RE.test(pass))
    e.pass = 'Mín. 8 caracteres, 1 mayúscula y 1 número.';
  if (!passConf)
    e.passConf = 'Confirma tu contraseña.';
  else if (pass !== passConf)
    e.passConf = 'Las contraseñas no coinciden.';
  return e;
}

// ─── Fortaleza de contraseña ──────────────────────────────────────────────────
function passStrength(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8)           s++;
  if (/[A-Z]/.test(p))         s++;
  if (/\d/.test(p))            s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
const STR_LABELS = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
const STR_COLORS = ['', COLORS.statusDanger, '#F59E0B', '#3B82F6', COLORS.statusOk];

// ─── Componente Field ─────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, secureTextEntry, keyboardType,
  icon, error, hint, autoCapitalize = 'none',
  returnKeyType, onSubmitEditing, inputRef,
}) {
  const [focused, setFocused] = useState(false);
  const [secure,  setSecure ] = useState(!!secureTextEntry);
  const hasError = !!error;

  return (
    <View style={fSt.outer}>
      <View style={[fSt.wrap, focused && fSt.wrapFocused, hasError && fSt.wrapError]}>
        <Text style={[fSt.label, (focused || value) && fSt.labelUp, hasError && fSt.labelError]}>
          {label}
        </Text>
        <View style={fSt.row}>
          {icon && (
            <MaterialIcons
              name={icon} size={18}
              color={hasError ? COLORS.statusDanger : focused ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: SPACING.sm }}
            />
          )}
          <TextInput
            ref={inputRef}
            style={fSt.input}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secure}
            keyboardType={keyboardType ?? 'default'}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            returnKeyType={returnKeyType ?? 'next'}
            onSubmitEditing={onSubmitEditing}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {secureTextEntry && (
            <TouchableOpacity onPress={() => setSecure((s) => !s)} hitSlop={8}>
              <MaterialIcons
                name={secure ? 'visibility-off' : 'visibility'}
                size={20} color={COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
          {!secureTextEntry && value?.length > 0 && !hasError && (
            <MaterialIcons name="check-circle" size={18} color={COLORS.statusOk} />
          )}
          {hasError && (
            <MaterialIcons name="error-outline" size={18} color={COLORS.statusDanger} />
          )}
        </View>
      </View>
      {hasError
        ? <Text style={fSt.errMsg}>{'⚠ '}{error}</Text>
        : hint ? <Text style={fSt.hint}>{hint}</Text>
        : null}
    </View>
  );
}

const fSt = StyleSheet.create({
  outer:      { marginBottom: SPACING.sm },
  wrap:       { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
                paddingHorizontal: SPACING.md, paddingTop: SPACING.sm,
                paddingBottom: SPACING.xs, backgroundColor: COLORS.bgCard },
  wrapFocused:{ borderColor: COLORS.primary },
  wrapError:  { borderColor: COLORS.statusDanger, backgroundColor: `${COLORS.statusDanger}06` },
  label:      { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.fontMedium,
                letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 2 },
  labelUp:    { color: COLORS.primary },
  labelError: { color: COLORS.statusDanger },
  row:        { flexDirection: 'row', alignItems: 'center' },
  input:      { flex: 1, fontSize: TYPOGRAPHY.md, color: COLORS.textPrimary,
                paddingVertical: SPACING.xs },
  errMsg:     { fontSize: TYPOGRAPHY.xs, color: COLORS.statusDanger,
                marginTop: 3, marginLeft: SPACING.xs, lineHeight: 16 },
  hint:       { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted,
                marginTop: 3, marginLeft: SPACING.xs },
});

// ─── Barra de fortaleza ───────────────────────────────────────────────────────
function StrengthBar({ password }) {
  const s = passStrength(password);
  if (!password) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center',
                   gap: SPACING.sm, marginBottom: SPACING.sm }}>
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2,
            backgroundColor: i <= s ? STR_COLORS[s] : COLORS.border }} />
        ))}
      </View>
      <Text style={{ fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.fontSemibold,
        color: STR_COLORS[s], minWidth: 46 }}>
        {STR_LABELS[s]}
      </Text>
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export function LoginScreen() {
  const { login, register, enterGuestMode, resetPassword } = useAuth();

  const [view,        setView      ] = useState('login');
  const shakeAnim                    = useRef(new Animated.Value(0)).current;

  // Login
  const [boleta,      setBoleta    ] = useState('');
  const [password,    setPass      ] = useState('');

  // Registro
  const [rNombre,     setRNombre   ] = useState('');
  const [rApellido,   setRApellido ] = useState('');
  const [rBoleta,     setRBoleta   ] = useState('');
  const [rCorreo,     setRCorreo   ] = useState('');
  const [rPass,       setRPass     ] = useState('');
  const [rPassConf,   setRPassConf ] = useState('');

  const [errors,      setErrors    ] = useState({});
  const [loading,     setLoading   ] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [forgotSent,  setForgotSent ] = useState(false);

  // Refs para navegación con teclado
  const refPass      = useRef();
  const refRApellido = useRef();
  const refRBoleta   = useRef();
  const refRCorreo   = useRef();
  const refRPass     = useRef();
  const refRPassConf = useRef();

  const shake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const switchTo = (t) => {
    setErrors({});
    setGlobalError('');
    setForgotSent(false);
    setView(t);
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const errs = validateLogin(boleta, password);
    if (Object.keys(errs).length) { setErrors(errs); shake(); return; }
    setErrors({});
    setLoading(true);
    setGlobalError('');
    try {
      // CORRECCIÓN: Pasar 'credential' para que coincida con la firma en api.js
      await login({ credential: boleta.trim(), password });
    } catch (e) {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      else setGlobalError(e.message ?? 'Credenciales incorrectas.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Registro ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    const errs = validateRegister(rNombre, rApellido, rBoleta, rCorreo, rPass, rPassConf);
    if (Object.keys(errs).length) { setErrors(errs); shake(); return; }
    setErrors({});
    setLoading(true);
    setGlobalError('');
    try {
      // CORRECCIÓN: Concatenar el nombre y mapear las llaves a lo que espera api.js
      await register({
        nombreCompleto: `${rNombre.trim()} ${rApellido.trim()}`,
        boleta:         rBoleta.trim(),
        correo:         rCorreo.trim().toLowerCase(),
        password:       rPass,
      });
    } catch (e) {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      else setGlobalError(e.message ?? 'No se pudo crear la cuenta.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Recuperar contraseña ────────────────────────────────────────────────────
  const handleForgot = async () => {
    if (!boleta.trim()) {
      setErrors({ boleta: 'Ingresa tu boleta o correo primero.' });
      shake();
      return;
    }
    setLoading(true);
    try {
      await resetPassword(boleta.trim());
      setForgotSent(true);
      setTimeout(() => setForgotSent(false), 5000);
    } catch (e) {
      setGlobalError(e.message ?? 'No se pudo enviar el correo de recuperación.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={st.hero}>
            <View style={st.heroLogo}>
              <Text style={st.heroLogoText}>SS</Text>
            </View>
            <Text style={st.heroTitle}>Sendero Seguro</Text>
            <Text style={st.heroSub}>
              {'Plataforma de seguridad comunitaria\nESCOM · Instituto Politécnico Nacional'}
            </Text>
            <View style={st.heroPills}>
              {['🛡 Seguridad', '📡 Red Mesh', '🆘 Alertas SOS'].map((f) => (
                <View key={f} style={st.heroPill}>
                  <Text style={st.heroPillText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tabs login / registro */}
          <View style={st.tabs}>
            {['login', 'register'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[st.tab, view === t && st.tabActive]}
                onPress={() => switchTo(t)}
                activeOpacity={0.7}
              >
                <Text style={[st.tabText, view === t && st.tabTextActive]}>
                  {t === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Card animada */}
          <Animated.View style={[st.card, { transform: [{ translateX: shakeAnim }] }]}>

            {/* Error global */}
            {globalError !== '' && (
              <View style={st.globalError}>
                <MaterialIcons name="error-outline" size={18} color={COLORS.statusDanger} />
                <Text style={st.globalErrorText}>{globalError}</Text>
              </View>
            )}

            {/* ── LOGIN ── */}
            {view === 'login' && (
              <View>
                <Text style={st.formTitle}>Bienvenido de vuelta</Text>
                <Text style={st.formSub}>Ingresa con tu boleta o correo institucional</Text>

                <Field
                  label="Boleta o correo institucional"
                  icon="school"
                  value={boleta}
                  onChangeText={(t) => { setBoleta(t); setErrors((e) => ({ ...e, boleta: '' })); }}
                  keyboardType="email-address"
                  error={errors.boleta}
                  hint="Ej: 2023630001 o correo@alumno.ipn.mx"
                  returnKeyType="next"
                  onSubmitEditing={() => refPass.current?.focus()}
                />

                <Field
                  label="Contraseña"
                  icon="lock"
                  inputRef={refPass}
                  value={password}
                  onChangeText={(t) => { setPass(t); setErrors((e) => ({ ...e, password: '' })); }}
                  secureTextEntry
                  error={errors.password}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />

                {forgotSent ? (
                  <View style={st.forgotSentBox}>
                    <MaterialIcons name="check-circle" size={16} color={COLORS.statusOk} />
                    <Text style={st.forgotSentText}>
                      Correo de recuperación enviado a tu cuenta institucional.
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={st.forgotBtn}
                    onPress={handleForgot}
                    disabled={loading}
                  >
                    <Text style={st.forgotText}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[st.submitBtn, loading && st.submitBtnDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={st.submitBtnText}>Iniciar Sesión</Text>}
                </TouchableOpacity>

                <View style={st.dividerRow}>
                  <View style={st.dividerLine} />
                  <Text style={st.dividerText}>o continúa como</Text>
                  <View style={st.dividerLine} />
                </View>

                <TouchableOpacity style={st.guestBtn} onPress={enterGuestMode} activeOpacity={0.8}>
                  <MaterialIcons name="person-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={st.guestText}>Modo Invitado</Text>
                </TouchableOpacity>
                <Text style={st.guestNote}>
                  Solo visualización · Alertas SOS deshabilitadas
                </Text>
              </View>
            )}

            {/* ── REGISTRO ── */}
            {view === 'register' && (
              <View>
                <Text style={st.formTitle}>Crear cuenta institucional</Text>
                <Text style={st.formSub}>Requiere correo @alumno.ipn.mx o @ipn.mx</Text>

                <Field
                  label="Nombre(s)"
                  icon="person"
                  value={rNombre}
                  onChangeText={(t) => { setRNombre(t); setErrors((e) => ({ ...e, nombre: '' })); }}
                  autoCapitalize="words"
                  error={errors.nombre}
                  hint="Solo tu(s) nombre(s)"
                  returnKeyType="next"
                  onSubmitEditing={() => refRApellido.current?.focus()}
                />

                <Field
                  label="Apellidos"
                  icon="person-outline"
                  inputRef={refRApellido}
                  value={rApellido}
                  onChangeText={(t) => { setRApellido(t); setErrors((e) => ({ ...e, apellido: '' })); }}
                  autoCapitalize="words"
                  error={errors.apellido}
                  hint="Apellido paterno y materno"
                  returnKeyType="next"
                  onSubmitEditing={() => refRBoleta.current?.focus()}
                />

                <Field
                  label="Número de boleta"
                  icon="school"
                  inputRef={refRBoleta}
                  value={rBoleta}
                  onChangeText={(t) => {
                    setRBoleta(t.replace(/\D/g, '').slice(0, 10));
                    setErrors((e) => ({ ...e, boleta: '' }));
                  }}
                  keyboardType="numeric"
                  error={errors.boleta}
                  hint="10 dígitos — Ej: 2023630001"
                  returnKeyType="next"
                  onSubmitEditing={() => refRCorreo.current?.focus()}
                />

                <Field
                  label="Correo institucional"
                  icon="mail-outline"
                  inputRef={refRCorreo}
                  value={rCorreo}
                  onChangeText={(t) => { setRCorreo(t); setErrors((e) => ({ ...e, correo: '' })); }}
                  keyboardType="email-address"
                  error={errors.correo}
                  hint="boleta@alumno.ipn.mx"
                  returnKeyType="next"
                  onSubmitEditing={() => refRPass.current?.focus()}
                />

                <Field
                  label="Contraseña"
                  icon="lock"
                  inputRef={refRPass}
                  value={rPass}
                  onChangeText={(t) => { setRPass(t); setErrors((e) => ({ ...e, pass: '' })); }}
                  secureTextEntry
                  error={errors.pass}
                  returnKeyType="next"
                  onSubmitEditing={() => refRPassConf.current?.focus()}
                />
                <StrengthBar password={rPass} />

                <Field
                  label="Confirmar contraseña"
                  icon="lock-outline"
                  inputRef={refRPassConf}
                  value={rPassConf}
                  onChangeText={(t) => { setRPassConf(t); setErrors((e) => ({ ...e, passConf: '' })); }}
                  secureTextEntry
                  error={errors.passConf}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />

                <View style={st.infoBox}>
                  <MaterialIcons name="info-outline" size={16} color={COLORS.statusInfo} />
                  <Text style={st.infoText}>
                    Tu cuenta se autentica con tu correo institucional IPN.
                  </Text>
                </View>

                {Object.values(errors).filter(Boolean).length > 1 && (
                  <View style={st.errorSummary}>
                    <Text style={st.errorSummaryText}>
                      {'Corrige '}
                      {Object.values(errors).filter(Boolean).length}
                      {' campos para continuar'}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[st.submitBtn, loading && st.submitBtnDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={st.submitBtnText}>Crear Cuenta</Text>}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          <Text style={st.footer}>
            {'© '}
            {new Date().getFullYear()}
            {' ESCOM — IPN · Sistemas Operativos\nPRIVACIDAD · TÉRMINOS · AYUDA'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bgBase },
  scroll: { flexGrow: 1, padding: SPACING.base, paddingVertical: SPACING.xl },

  hero:         { alignItems: 'center', marginBottom: SPACING.xl, paddingTop: SPACING.lg },
  heroLogo:     { width: 56, height: 56, borderRadius: RADIUS.lg,
                  backgroundColor: COLORS.primary, alignItems: 'center',
                  justifyContent: 'center', marginBottom: SPACING.md, ...SHADOW.panic },
  heroLogoText: { color: '#FFF', fontSize: TYPOGRAPHY.xl,
                  fontWeight: TYPOGRAPHY.fontBold, letterSpacing: 1 },
  heroTitle:    { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.fontBold,
                  color: COLORS.textPrimary, marginBottom: SPACING.xs, letterSpacing: 0.5 },
  heroSub:      { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted,
                  textAlign: 'center', lineHeight: 20, marginBottom: SPACING.md },
  heroPills:    { flexDirection: 'row', gap: SPACING.xs,
                  flexWrap: 'wrap', justifyContent: 'center' },
  heroPill:     { backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full,
                  paddingHorizontal: SPACING.md, paddingVertical: 4,
                  borderWidth: 1, borderColor: COLORS.primaryMuted },
  heroPillText: { fontSize: TYPOGRAPHY.xs, color: COLORS.primary,
                  fontWeight: TYPOGRAPHY.fontSemibold },

  tabs:          { flexDirection: 'row', backgroundColor: COLORS.bgCardAlt,
                   borderRadius: RADIUS.lg, padding: 4, marginBottom: SPACING.md,
                   borderWidth: 1, borderColor: COLORS.border },
  tab:           { flex: 1, paddingVertical: SPACING.sm,
                   alignItems: 'center', borderRadius: RADIUS.md },
  tabActive:     { backgroundColor: COLORS.bgCard, ...SHADOW.card },
  tabText:       { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted,
                   fontWeight: TYPOGRAPHY.fontMedium },
  tabTextActive: { color: COLORS.primary, fontWeight: TYPOGRAPHY.fontBold },

  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
          padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border,
          marginBottom: SPACING.md, ...SHADOW.card },

  globalError:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                     backgroundColor: COLORS.statusDangerBg, borderRadius: RADIUS.md,
                     padding: SPACING.md, marginBottom: SPACING.md,
                     borderLeftWidth: 3, borderLeftColor: COLORS.statusDanger },
  globalErrorText: { flex: 1, fontSize: TYPOGRAPHY.sm,
                     color: COLORS.statusDanger, lineHeight: 18 },

  formTitle: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.fontBold,
               color: COLORS.textPrimary, marginBottom: SPACING.xs },
  formSub:   { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted,
               marginBottom: SPACING.lg, lineHeight: 18 },

  forgotBtn:      { alignSelf: 'flex-end', marginBottom: SPACING.md,
                    marginTop: -SPACING.xs },
  forgotText:     { color: COLORS.primary, fontSize: TYPOGRAPHY.xs,
                    fontWeight: TYPOGRAPHY.fontMedium },
  forgotSentBox:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
                    backgroundColor: COLORS.statusOkBg, borderRadius: RADIUS.sm,
                    padding: SPACING.sm, marginBottom: SPACING.md },
  forgotSentText: { fontSize: TYPOGRAPHY.xs, color: COLORS.statusOk,
                    flex: 1, lineHeight: 16 },

  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
                       paddingVertical: SPACING.md, alignItems: 'center',
                       justifyContent: 'center', minHeight: 48,
                       marginTop: SPACING.xs, ...SHADOW.panic },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { color: '#FFF', fontSize: TYPOGRAPHY.base,
                       fontWeight: TYPOGRAPHY.fontBold, letterSpacing: 0.5 },

  dividerRow:  { flexDirection: 'row', alignItems: 'center',
                 marginVertical: SPACING.md, gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.xs },

  guestBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
               gap: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border,
               borderRadius: RADIUS.md, paddingVertical: SPACING.md,
               backgroundColor: COLORS.bgCardAlt },
  guestText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sm,
               fontWeight: TYPOGRAPHY.fontSemibold },
  guestNote: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.xs,
               textAlign: 'center', marginTop: SPACING.sm, letterSpacing: 0.3 },

  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
              backgroundColor: COLORS.statusInfoBg, borderRadius: RADIUS.md,
              padding: SPACING.md, marginBottom: SPACING.md,
              borderLeftWidth: 3, borderLeftColor: COLORS.statusInfo },
  infoText: { flex: 1, color: COLORS.statusInfo,
              fontSize: TYPOGRAPHY.xs, lineHeight: 17 },

  errorSummary:     { backgroundColor: COLORS.statusDangerBg, borderRadius: RADIUS.md,
                      padding: SPACING.sm, marginBottom: SPACING.sm,
                      alignItems: 'center' },
  errorSummaryText: { color: COLORS.statusDanger, fontSize: TYPOGRAPHY.xs,
                      fontWeight: TYPOGRAPHY.fontSemibold },

  footer: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.xs,
            textAlign: 'center', lineHeight: 18, letterSpacing: 0.3 },
});

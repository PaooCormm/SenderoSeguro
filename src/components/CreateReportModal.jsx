/**
 * CreateReportModal
 * RF4 — Crear Reporte
 * Modal para redactar y enviar un nuevo reporte de incidente.
 * Sin backend: simula envío con estado local.
 * Incluye: categorías, ubicaciones predefinidas ESCOM, toggle anónimo, foto (mock).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOW } from '../constants/theme';
import api from '../services/api';

// ─── Categorías ───────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { id: 'emergencia',       icono: '🚨', label: 'Emergencia',       color: COLORS.statusDanger },
  { id: 'alumbrado',        icono: '💡', label: 'Alumbrado',        color: '#D97706'           },
  { id: 'camara',           icono: '📹', label: 'Cámara averiada',  color: '#7C3AED'           },
  { id: 'sospechoso',       icono: '🚷', label: 'Persona sospechosa', color: '#DC2626'         },
  { id: 'infraestructura',  icono: '🔧', label: 'Infraestructura',  color: '#0891B2'           },
  { id: 'acceso',           icono: '🚧', label: 'Acceso bloqueado', color: '#B45309'           },
  { id: 'otro',             icono: '📋', label: 'Otro',             color: COLORS.textMuted    },
];

// ─── Ubicaciones ESCOM ────────────────────────────────────────────────────────
const UBICACIONES = [
  'Acceso Norte — Av. Juan de Dios Bátiz',
  'Acceso Sur — Wilfrido Massieu',
  'Edificio A — Aulas',
  'Edificio B — Posgrado',
  'Laboratorio de Redes (2do piso)',
  'Laboratorio de Software (3er piso)',
  'Módulo C — Titulación',
  'Cafetería Central',
  'Estacionamiento Interno',
  'Estacionamiento Sur — Zacatenco',
  'Canchas Deportivas',
  'Biblioteca ESCOM',
  'Área de Tutorías',
  'Pasillos Generales',
  'Otra ubicación…',
];

// ─── Modal ────────────────────────────────────────────────────────────────────
export function CreateReportModal({ visible, onClose, onSubmit, guestMode }) {
  const [categoria,    setCategoria   ] = useState(null);
  const [ubicacion,    setUbicacion   ] = useState(null);
  const [descripcion,  setDescripcion ] = useState('');
  const [anonimo,      setAnonimo     ] = useState(false);
  const [tieneFoto,    setTieneFoto   ] = useState(false);
  const [enviando,     setEnviando    ] = useState(false);
  const [enviado,      setEnviado     ] = useState(false);
  const [error,        setError       ] = useState('');

  const puedeEnviar = categoria && ubicacion && descripcion.trim().length >= 10;

  const resetForm = () => {
    setCategoria(null);
    setUbicacion(null);
    setDescripcion('');
    setAnonimo(false);
    setTieneFoto(false);
    setEnviando(false);
    setEnviado(false);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!puedeEnviar) {
      setError('Completa la categoría, ubicación y descripción (mín. 10 caracteres).');
      return;
    }
    setError('');
    setEnviando(true);

    // 1. Traductor: Convertimos los IDs de tus botones a los de la Base de Datos
    const categoriasValidas = {
      'emergencia': 'emergencia_medica',
      'alumbrado': 'infraestructura',
      'camara': 'infraestructura',
      'sospechoso': 'persona_sospechosa',
      'infraestructura': 'infraestructura',
      'acceso': 'transporte_movilidad',
      'otro': 'otro'
    };
    
    // Si por alguna razón no coincide, mandamos 'otro' por defecto
    const categoriaDB = categoriasValidas[categoria.id] || 'otro';

    try {
      // 2. El Payload
      const payload = {
        titulo: `${categoria.label} en ${ubicacion}`,
        descripcion: descripcion.trim(),
        categoria: categoriaDB,   
        latitud: 19.5045,        
        longitud: -99.1469,        
        ubicacionTexto: ubicacion, 
        esAnonimo: anonimo         
      };

      // Enviamos el reporte real a la API
      await api.crearReporte(payload);

      setEnviando(false);
      setEnviado(true);

      // Ejecuta la recarga de tu lista de reportes
      onSubmit?.();

      // Auto-cerrar tras 2s
      setTimeout(handleClose, 2000);

    } catch (err) {
      setEnviando(false);
      console.error("Error al crear reporte:", err);
      setError(err.message || 'Error al conectar con el servidor.');
    }
  };

  // ─── Estado de éxito ────────────────────────────────────────────────────────
  if (enviado) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Reporte enviado</Text>
            <Text style={styles.successSub}>
              Gracias por contribuir a la seguridad del campus ESCOM.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Nuevo Reporte</Text>
              <Text style={styles.headerSub}>ESCOM · Campus Zacatenco</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Categoría */}
            <Text style={styles.label}>Tipo de incidente *</Text>
            <View style={styles.categoriasGrid}>
              {CATEGORIAS.map((cat) => {
                const activa = categoria?.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoriaCard,
                      activa && { borderColor: cat.color, backgroundColor: `${cat.color}12` },
                    ]}
                    onPress={() => setCategoria(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoriaIcono}>{cat.icono}</Text>
                    <Text
                      style={[
                        styles.categoriaLabel,
                        activa && { color: cat.color, fontWeight: TYPOGRAPHY.fontSemibold },
                      ]}
                      numberOfLines={2}
                    >
                      {cat.label}
                    </Text>
                    {activa && (
                      <View style={[styles.categoriaCheck, { backgroundColor: cat.color }]}>
                        <Text style={styles.categoriaCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ubicación */}
            <Text style={styles.label}>Ubicación *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.ubicScroll}
              contentContainerStyle={styles.ubicContent}
            >
              {UBICACIONES.map((u) => {
                const activa = ubicacion === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.ubicChip, activa && styles.ubicChipActive]}
                    onPress={() => setUbicacion(u)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.ubicChipText, activa && styles.ubicChipTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Descripción */}
            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Describe el incidente con el mayor detalle posible. ¿Qué ocurrió? ¿A qué hora? ¿Había más personas involucradas?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={descripcion}
              onChangeText={setDescripcion}
              maxLength={500}
            />
            <Text style={styles.charCount}>{descripcion.length}/500</Text>

            {/* Opciones extra */}
            <View style={styles.opcionesCard}>
              {/* Toggle anónimo */}
              <View style={styles.opcionRow}>
                <View style={styles.opcionInfo}>
                  <Text style={styles.opcionLabel}>Enviar de forma anónima</Text>
                  <Text style={styles.opcionDesc}>
                    Tu nombre no aparecerá en el reporte público.
                  </Text>
                </View>
                <Switch
                  value={anonimo}
                  onValueChange={setAnonimo}
                  trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
                  thumbColor={anonimo ? COLORS.primary : COLORS.bgCardAlt}
                />
              </View>

              <View style={styles.opcionDivider} />

              {/* Adjuntar foto (mock) */}
              <View style={styles.opcionRow}>
                <View style={styles.opcionInfo}>
                  <Text style={styles.opcionLabel}>Adjuntar fotografía</Text>
                  <Text style={styles.opcionDesc}>
                    Una imagen de apoyo al reporte.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.fotoBtn,
                    tieneFoto && styles.fotoBtnActive,
                  ]}
                  onPress={() => setTieneFoto((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fotoBtnText}>
                    {tieneFoto ? '📷 Adjunta' : '📷 Adjuntar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Mensaje de error */}
            {error.length > 0 && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            {/* Vista previa del reporte */}
            {categoria && ubicacion && descripcion.trim().length >= 10 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Vista previa</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewIcon}>{categoria.icono}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewCat}>{categoria.label}</Text>
                    <Text style={styles.previewUbic} numberOfLines={1}>📍 {ubicacion}</Text>
                  </View>
                  {anonimo && (
                    <View style={styles.anonimoBadge}>
                      <Text style={styles.anonimoText}>Anónimo</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.previewDesc} numberOfLines={3}>
                  {descripcion}
                </Text>
              </View>
            )}

            {/* Espaciado inferior */}
            <View style={{ height: SPACING.xl }} />
          </ScrollView>

          {/* Footer — botón enviar */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                !puedeEnviar && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!puedeEnviar || enviando}
              activeOpacity={0.85}
            >
              {enviando ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Enviar Reporte</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor:      COLORS.bgBase,
    borderTopLeftRadius:  RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    height:               '92%',
    borderTopWidth:       1,
    borderTopColor:       COLORS.border,
    flexDirection:        'column',
    ...SHADOW.card,
  },

  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: COLORS.border,
    alignSelf:       'center',
    marginTop:       SPACING.md,
  },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop:        SPACING.md,
    paddingBottom:     SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize:   TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.fontBold,
    color:      COLORS.textPrimary,
  },
  headerSub: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textMuted,
  },
  closeBtn: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: COLORS.bgCardAlt,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  closeBtnText: {
    fontSize:   13,
    color:      COLORS.textMuted,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop:        SPACING.md,
  },

  // Labels
  label: {
    fontSize:      TYPOGRAPHY.xs,
    fontWeight:    TYPOGRAPHY.fontSemibold,
    color:         COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  SPACING.sm,
    marginTop:     SPACING.md,
  },

  // Grid de categorías
  categoriasGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           SPACING.xs,
  },
  categoriaCard: {
    width:           '30%',
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.md,
    borderWidth:     1.5,
    borderColor:     COLORS.border,
    padding:         SPACING.sm,
    alignItems:      'center',
    gap:             4,
    position:        'relative',
  },
  categoriaIcono: { fontSize: 22 },
  categoriaLabel: {
    fontSize:   TYPOGRAPHY.xs,
    color:      COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontMedium,
    textAlign:  'center',
  },
  categoriaCheck: {
    position:      'absolute',
    top:           -6,
    right:         -6,
    width:         18,
    height:        18,
    borderRadius:  9,
    alignItems:    'center',
    justifyContent:'center',
  },
  categoriaCheckText: {
    color:    '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Chips de ubicación
  ubicScroll:   { marginBottom: SPACING.xs },
  ubicContent:  { gap: SPACING.xs, paddingRight: SPACING.md },
  ubicChip: {
    backgroundColor:   COLORS.bgCard,
    borderRadius:      RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
    borderWidth:       1,
    borderColor:       COLORS.border,
  },
  ubicChipActive: {
    backgroundColor: COLORS.primaryBg,
    borderColor:     COLORS.primary,
  },
  ubicChipText: {
    fontSize:   TYPOGRAPHY.xs,
    color:      COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontMedium,
  },
  ubicChipTextActive: {
    color:      COLORS.primary,
    fontWeight: TYPOGRAPHY.fontSemibold,
  },

  // Textarea
  textarea: {
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    padding:         SPACING.md,
    fontSize:        TYPOGRAPHY.sm,
    color:           COLORS.textPrimary,
    minHeight:       110,
    lineHeight:      20,
  },
  charCount: {
    fontSize:  TYPOGRAPHY.xs,
    color:     COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: SPACING.sm,
  },

  // Opciones
  opcionesCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.lg,
    borderWidth:     1,
    borderColor:     COLORS.border,
    overflow:        'hidden',
    marginTop:       SPACING.xs,
  },
  opcionRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.md,
    gap:               SPACING.sm,
  },
  opcionInfo: { flex: 1 },
  opcionLabel: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontMedium,
    color:      COLORS.textPrimary,
  },
  opcionDesc: {
    fontSize:  TYPOGRAPHY.xs,
    color:     COLORS.textMuted,
    marginTop: 2,
  },
  opcionDivider: {
    height:          1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  fotoBtn: {
    backgroundColor:   COLORS.bgCardAlt,
    borderRadius:      RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
    borderWidth:       1,
    borderColor:       COLORS.border,
  },
  fotoBtnActive: {
    backgroundColor: COLORS.primaryBg,
    borderColor:     COLORS.primary,
  },
  fotoBtnText: {
    fontSize:   TYPOGRAPHY.xs,
    color:      COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontMedium,
  },

  // Error
  errorBox: {
    backgroundColor: COLORS.statusDangerBg,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginTop:       SPACING.md,
    borderWidth:     1,
    borderColor:     `${COLORS.statusDanger}40`,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sm,
    color:    COLORS.statusDanger,
    lineHeight: 18,
  },

  // Vista previa
  previewBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    marginTop:       SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  previewTitle: {
    fontSize:     TYPOGRAPHY.xs,
    fontWeight:   TYPOGRAPHY.fontBold,
    color:        COLORS.textMuted,
    textTransform:'uppercase',
    letterSpacing: 0.5,
    marginBottom:  SPACING.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    marginBottom:  SPACING.xs,
  },
  previewIcon:  { fontSize: 20 },
  previewCat: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontSemibold,
    color:      COLORS.textPrimary,
  },
  previewUbic: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textMuted,
  },
  previewDesc: {
    fontSize:  TYPOGRAPHY.sm,
    color:     COLORS.textSecondary,
    lineHeight: 18,
  },

  // Anónimo badge
  anonimoBadge: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius:    RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical:   2,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  anonimoText: {
    fontSize:  TYPOGRAPHY.xs,
    color:     COLORS.textMuted,
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    flexDirection:     'row',
    gap:               SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical:   SPACING.md,
    borderTopWidth:    1,
    borderTopColor:    COLORS.border,
    backgroundColor:   COLORS.bgBase,
  },
  cancelBtn: {
    flex:            1,
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  cancelBtnText: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontSemibold,
    color:      COLORS.textSecondary,
  },
  submitBtn: {
    flex:            2,
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems:      'center',
    justifyContent:  'center',
    ...SHADOW.panic,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color:      '#FFF',
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontBold,
  },

  // Success
  successBox: {
    backgroundColor: COLORS.bgBase,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.xxl,
    margin:          SPACING.base,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.border,
    ...SHADOW.card,
  },
  successIcon: {
    fontSize:     48,
    marginBottom: SPACING.md,
  },
  successTitle: {
    fontSize:   TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.fontBold,
    color:      COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  successSub: {
    fontSize:  TYPOGRAPHY.sm,
    color:     COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

/**
 * src/screens/FeedScreen.jsx
 *
 * Feed comunitario conectado a la API real.
 * Categorías según el schema: robo, acoso, persona_sospechosa,
 * infraestructura, emergencia_medica, violencia_agresion, accidente,
 * objeto_sospechoso, riesgo_ambiental, transporte_movilidad,
 * seguridad_preventiva, otro
 *
 * Cache local si no hay red.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOW } from '../constants/theme';
import { Divider, SectionHeader } from '../components/UIElements';
import api from '../services/api';
import {CreateReportModal} from '../components/CreateReportModal';

// ─── Config de categorías ─────────────────────────────────────────────────────
const CATEGORIA_CONFIG = {
  robo:                 { icon: 'report-problem',  color: COLORS.statusDanger, label: 'Robo'              },
  acoso:                { icon: 'person-off',      color: '#DC2626',           label: 'Acoso'             },
  persona_sospechosa:   { icon: 'visibility',      color: '#7C3AED',           label: 'Pers. sospechosa'  },
  infraestructura:      { icon: 'construction',    color: '#0891B2',           label: 'Infraestructura'   },
  emergencia_medica:    { icon: 'local-hospital',  color: '#DB2777',           label: 'Emergencia médica' },
  violencia_agresion:   { icon: 'warning',         color: COLORS.statusDanger, label: 'Violencia'         },
  accidente:            { icon: 'car-crash',       color: '#D97706',           label: 'Accidente'         },
  objeto_sospechoso:    { icon: 'inventory',       color: '#B45309',           label: 'Objeto sospechoso' },
  riesgo_ambiental:     { icon: 'eco',             color: '#15803D',           label: 'Riesgo ambiental'  },
  transporte_movilidad: { icon: 'directions-bus',  color: '#1D4ED8',           label: 'Transporte'        },
  seguridad_preventiva: { icon: 'security',        color: COLORS.statusOk,     label: 'Preventivo'        },
  otro:                 { icon: 'help-outline',    color: COLORS.textMuted,    label: 'Otro'              },
};

const ESTADO_CONFIG = {
  pendiente:   { bg: COLORS.statusWarnBg,   text: '#B45309'           },
  verificado:  { bg: '#EFF6FF',             text: '#1D4ED8'           },
  resuelto:    { bg: COLORS.statusOkBg,     text: COLORS.statusOk     },
  rechazado:   { bg: COLORS.bgCardAlt,      text: COLORS.textMuted    },
};

const FILTROS = [
  { id: 'todos',               label: 'Todos',       icon: 'list'           },
  { id: 'robo',                label: 'Robo',        icon: 'report-problem' },
  { id: 'acoso',               label: 'Acoso',       icon: 'person-off'     },
  { id: 'persona_sospechosa',  label: 'Sospechoso',  icon: 'visibility'     },
  { id: 'infraestructura',     label: 'Infraestr.',  icon: 'construction'   },
  { id: 'emergencia_medica',   label: 'Médica',      icon: 'local-hospital' },
  { id: 'seguridad_preventiva',label: 'Preventivo',  icon: 'security'       },
  { id: 'otro',                label: 'Otro',        icon: 'help-outline'   },
];

const CACHE_KEY = 'sendero_cached_reports';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tiempoRelativo(iso) {
  if (!iso) return 'Fecha desconocida';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 'Hace un momento';

  const diff = Date.now() - date.getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Hace ${hrs} hr${hrs > 1 ? 's' : ''}`;
  const dias = Math.floor(hrs / 24);
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

// ─── Tarjeta de reporte ───────────────────────────────────────────────────────
function ReportCard({ item, guestMode }) {
  const [utiles, setUtiles ] = useState(item.utiles ?? 0);
  const [votado, setVotado ] = useState(Boolean(item.likedByMe));
  const [voting, setVoting ] = useState(false);

  const cfg    = CATEGORIA_CONFIG[item.categoria] ?? CATEGORIA_CONFIG.otro;
  const estado = ESTADO_CONFIG[item.estado] ?? ESTADO_CONFIG.pendiente;

  // 1. Usamos las llaves exactas del JSON
  const fechaReporte = item.createdAt;
  const nombreAutor  = item.autorNombre || '@usuario';
  const anonimo      = item.esAnonimo;
  const ubicacion    = item.ubicacionTexto;

  const handleVote = async () => {
    if (votado || guestMode || voting) return;
    setVoting(true);
    try {
      const res = await api.votarReporte(item.id);
      setUtiles(res.utiles ?? utiles + 1);
    } catch {
      setUtiles((u) => u + 1);
    } finally {
      setVotado(true);
      setVoting(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: `${cfg.color}15` }]}>
          <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.titulo}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardAutor}>
              {/* 2. Evaluamos la llave booleana correcta */}
              {anonimo ? 'Anónimo' : nombreAutor}
            </Text>
            <Text style={styles.cardDot}>·</Text>
            <Text style={styles.cardTiempo}>{tiempoRelativo(fechaReporte)}</Text>
          </View>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
          <Text style={[styles.estadoText, { color: estado.text }]}>
            {item.estado}
          </Text>
        </View>
      </View>

      {/* Descripción */}
      {item.descripcion ? (
        <Text style={styles.cardDesc} numberOfLines={3}>{item.descripcion}</Text>
      ) : null}

      {/* Ubicación usando la variable corregida */}
      {ubicacion ? (
        <View style={styles.ubicRow}>
          <MaterialIcons name="place" size={12} color={COLORS.textMuted} />
          <Text style={styles.ubicText} numberOfLines={1}>{ubicacion}</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[
            styles.votoBtn,
            votado && styles.votoBtnActive,
            (guestMode || voting) && styles.votoBtnDisabled,
          ]}
          onPress={handleVote}
          activeOpacity={guestMode ? 1 : 0.7}
          disabled={guestMode || voting || votado}
        >
          {voting
            ? <ActivityIndicator size={12} color={COLORS.primary} />
            : <MaterialIcons
                name={votado ? 'thumb-up' : 'thumb-up-off-alt'}
                size={14}
                color={votado ? COLORS.primary : COLORS.textMuted}
              />}
          <Text style={[styles.votoBtnText, votado && styles.votoBtnTextActive]}>
            {utiles} {utiles === 1 ? 'confirmación' : 'confirmaciones'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.categoriaBadge, { backgroundColor: `${cfg.color}15` }]}>
          <Text style={[styles.categoriaText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export function FeedScreen({ guestMode, onNewReport, style }) {
  const [reportes,   setReportes  ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError     ] = useState('');
  const [filtro,     setFiltro    ] = useState('todos');
  const [busqueda,   setBusqueda  ] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const cargar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = {};
      if (filtro !== 'todos') params.categoria = filtro;

      const res = await api.getReportes(params);

      // La API puede devolver { data: [] } o directamente []
      const lista = Array.isArray(res) ? res : (res.data ?? res.reports ?? []);
      setReportes(lista);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(lista));
    } catch {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setReportes(JSON.parse(cached));
        setError('Sin conexión — mostrando últimos reportes.');
      } else {
        setReportes([]);
        setError('Sin conexión.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    
  }, [filtro, guestMode]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return reportes;
    const q = busqueda.toLowerCase();
    return reportes.filter((r) =>
      (r.titulo ?? '').toLowerCase().includes(q) ||
      (r.descripcion ?? '').toLowerCase().includes(q) ||
      (r.ubicacion_txt ?? '').toLowerCase().includes(q),
    );
  }, [reportes, busqueda]);

  return (
    <ScrollView
      style={[styles.root, style]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => cargar(true)}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Feed Comunitario</Text>
          <Text style={styles.subheading}>ESCOM · Campus Zacatenco</Text>
        </View>
        {!guestMode && (
          <TouchableOpacity style={styles.newBtn} onPress={onNewReport} activeOpacity={0.85}>
            <MaterialIcons name="add" size={16} color="#FFF" />
            <Text style={styles.newBtnText}>Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Banner sin red */}
      {error !== '' && (
        <View style={styles.warnBanner}>
          <MaterialIcons name="wifi-off" size={14} color="#92400E" />
          <Text style={styles.warnBannerText}>{error}</Text>
        </View>
      )}

      {/* Búsqueda */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar reportes, zonas..."
          placeholderTextColor={COLORS.textMuted}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <MaterialIcons name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll} contentContainerStyle={styles.filtrosContent}
      >
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filtroChip, activo && styles.filtroChipActive]}
              onPress={() => setFiltro(f.id)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={f.icon} size={13}
                color={activo ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.filtroLabel, activo && styles.filtroLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Divider />

      <SectionHeader
        title={`${filtrados.length} reporte${filtrados.length !== 1 ? 's' : ''}`}
        badge={filtro !== 'todos' ? filtro.replace('_', ' ') : null}
      />

      {/* Aviso invitado */}
      {guestMode && (
        <View style={styles.guestNotice}>
          <MaterialIcons name="lock" size={14} color="#92400E" />
          <Text style={styles.guestNoticeText}>
            Inicia sesión para confirmar reportes y publicar nuevos.
          </Text>
        </View>
      )}

      {/* Error */}
      {error !== '' && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={14} color={COLORS.statusDanger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Lista */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando reportes...</Text>
        </View>
      ) : filtrados.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialIcons name="search-off" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptyText}>No hay reportes que coincidan.</Text>
        </View>
      ) : (
        filtrados.map((item) => (
          <ReportCard key={item.id} item={item} guestMode={guestMode} />
        ))
      )}

      <CreateReportModal 
        visible={modalVisible} 
        guestMode={guestMode}
        onClose={() => setModalVisible(false)} 
        onSubmit={() => {
          setModalVisible(false);
          cargar(true); // Recarga la lista para mostrar el nuevo reporte
        }} 
      />
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: SPACING.base, paddingBottom: SPACING.xxl },

  header: { flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: SPACING.md },
  heading:    { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.fontBold,
                color: COLORS.textPrimary },
  subheading: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2 },
  newBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
                paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, ...SHADOW.panic },
  newBtnText: { color: '#FFF', fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.fontBold },

  warnBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
                backgroundColor: COLORS.statusWarnBg, borderRadius: RADIUS.sm,
                padding: SPACING.sm, marginBottom: SPACING.sm,
                borderWidth: 1, borderColor: '#FDE68A' },
  warnBannerText: { fontSize: TYPOGRAPHY.xs, color: '#92400E' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
                borderWidth: 1, borderColor: COLORS.border,
                paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
                marginBottom: SPACING.md },
  searchInput: { flex: 1, fontSize: TYPOGRAPHY.sm, color: COLORS.textPrimary, padding: 0 },

  filtrosScroll:   { marginBottom: SPACING.sm },
  filtrosContent:  { gap: SPACING.xs, paddingRight: SPACING.md },
  filtroChip:      { flexDirection: 'row', alignItems: 'center', gap: 4,
                     backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full,
                     paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
                     borderWidth: 1, borderColor: COLORS.border },
  filtroChipActive:{ backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  filtroLabel:     { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary,
                     fontWeight: TYPOGRAPHY.fontMedium },
  filtroLabelActive:{ color: COLORS.primary, fontWeight: TYPOGRAPHY.fontSemibold },

  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
          padding: SPACING.md, marginBottom: SPACING.sm,
          borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start',
                gap: SPACING.sm, marginBottom: SPACING.sm },
  cardIconWrap: { width: 38, height: 38, borderRadius: RADIUS.sm,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.fontSemibold,
               color: COLORS.textPrimary, flex: 1, lineHeight: 18 },
  cardMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardAutor: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  cardDot:   { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  cardTiempo:{ fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  estadoBadge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm,
                 paddingVertical: 2, alignSelf: 'flex-start' },
  estadoText:  { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.fontBold,
                 textTransform: 'capitalize' },
  cardDesc:  { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary,
               lineHeight: 18, marginBottom: SPACING.sm },
  ubicRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm },
  ubicText:  { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, flex: 1 },
  cardFooter:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  votoBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4,
               backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.sm,
               paddingHorizontal: SPACING.sm, paddingVertical: 4,
               borderWidth: 1, borderColor: COLORS.border },
  votoBtnActive:   { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  votoBtnDisabled: { opacity: 0.5 },
  votoBtnText:     { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary,
                     fontWeight: TYPOGRAPHY.fontMedium },
  votoBtnTextActive:{ color: COLORS.primary },
  categoriaBadge:  { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  categoriaText:   { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.fontSemibold },

  guestNotice: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                 backgroundColor: COLORS.statusWarnBg, borderRadius: RADIUS.md,
                 padding: SPACING.md, marginBottom: SPACING.md,
                 borderWidth: 1, borderColor: '#FDE68A' },
  guestNoticeText: { fontSize: TYPOGRAPHY.xs, color: '#92400E', flex: 1, lineHeight: 16 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                 backgroundColor: COLORS.statusDangerBg, borderRadius: RADIUS.md,
                 padding: SPACING.md, marginBottom: SPACING.md },
  errorText:   { fontSize: TYPOGRAPHY.xs, color: COLORS.statusDanger, flex: 1 },

  loadingBox:  { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  loadingText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted },
  emptyBox:    { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle:  { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.fontBold,
                 color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptyText:   { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted,
                 textAlign: 'center', marginTop: SPACING.xs },
});

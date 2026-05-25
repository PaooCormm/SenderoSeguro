/**
 * HeatMapPanel
 * RF2 — Mapa de calor de incidentes
 * Muestra zonas de riesgo del campus ESCOM-IPN con datos mock.
 * Sin backend: usa coordenadas reales del campus Zacatenco.
 *
 * Dependencia: react-native-maps (ya usada en MapPanel)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOW, ESCOM_REGION } from '../constants/theme';
import api from '../services/api';

// ─── Zonas de calor — coordenadas reales ESCOM / Zacatenco ───────────────────
// Nivel: 1 = bajo (verde), 2 = medio (amarillo), 3 = alto (rojo)
const ZONAS_CALOR = [
  {
    id: 'z1',
    nombre: 'Acceso Norte',
    descripcion: 'Entrada principal Av. Juan de Dios Bátiz',
    lat:    19.50495,
    lng:   -99.14690,
    radio:  90,
    nivel:  3,
    incidentes: 8,
  },
  {
    id: 'z2',
    nombre: 'Edificio A — ESCOM',
    descripcion: 'Aulas principales, pasillo central',
    lat:    19.50440,
    lng:   -99.14740,
    radio:  70,
    nivel:  2,
    incidentes: 4,
  },
  {
    id: 'z3',
    nombre: 'Laboratorios de Redes',
    descripcion: '2do piso, área de práctica',
    lat:    19.50380,
    lng:   -99.14800,
    radio:  50,
    nivel:  2,
    incidentes: 3,
  },
  {
    id: 'z4',
    nombre: 'Estacionamiento Sur',
    descripcion: 'Zona vehicular Unidad Zacatenco',
    lat:    19.50290,
    lng:   -99.14720,
    radio:  120,
    nivel:  1,
    incidentes: 1,
  },
  {
    id: 'z5',
    nombre: 'Cafetería Central',
    descripcion: 'Área de descanso y comedor',
    lat:    19.50420,
    lng:   -99.14650,
    radio:  55,
    nivel:  1,
    incidentes: 2,
  },
  {
    id: 'z6',
    nombre: 'Módulo C — Titulación',
    descripcion: 'Cámara sin señal reportada',
    lat:    19.50360,
    lng:   -99.14590,
    radio:  60,
    nivel:  3,
    incidentes: 5,
  },
  {
    id: 'z7',
    nombre: 'Acceso Wilfrido Massieu',
    descripcion: 'Bache reportado — zona peatonal',
    lat:    19.50550,
    lng:   -99.14760,
    radio:  65,
    nivel:  2,
    incidentes: 3,
  },
  {
    id: 'z8',
    nombre: 'Canchas Deportivas',
    descripcion: 'Área abierta, iluminación deficiente',
    lat:    19.50470,
    lng:   -99.14870,
    radio:  100,
    nivel:  1,
    incidentes: 2,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NIVEL_CONFIG = {
  1: {
    label:       'Bajo',
    color:       COLORS.statusOk,
    bg:          COLORS.statusOkBg,
    fillOpacity: 0.18,
    strokeOpacity: 0.45,
  },
  2: {
    label:       'Medio',
    color:       COLORS.statusWarn,
    bg:          COLORS.statusWarnBg,
    fillOpacity: 0.22,
    strokeOpacity: 0.55,
  },
  3: {
    label:       'Alto',
    color:       COLORS.statusDanger,
    bg:          COLORS.statusDangerBg,
    fillOpacity: 0.28,
    strokeOpacity: 0.65,
  },
};

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function HeatMapPanel({ style }) {
  const [zonas, setZonas] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
  const [filtroNivel, setFiltroNivel]           = useState(0); // 0 = todos

  // Cargar zonas desde la API
  useEffect(() => {
    api.getZonas() // Esta función ya la tienes en tu api.js
      .then(res => {
        // Mapeamos los datos del servidor a lo que el mapa espera
        const mapeadas = res.zones.map(z => ({
          id: z.id,
          nombre: z.name,
          descripcion: z.description,
          // Extraemos lat/lng de tu geom (que viene como WKT: "POINT(lng lat)")
          lat: parseFloat(z.geom_text.split(' ')[2].replace(')', '')),
          lng: parseFloat(z.geom_text.split(' ')[1].replace('(', '')),
          radio: 80, // Valor fijo o devuelto por tu DB
          nivel: z.risk_level === 'high' ? 3 : (z.risk_level === 'medium' ? 2 : 1),
          incidentes: 0 // Si tu DB no tiene conteo, puedes dejarlo en 0
        }));
        setZonas(mapeadas);
      })
      .catch(err => console.error("Error cargando zonas:", err))
      .finally(() => setLoading(false));
  }, []);

  const zonasFiltradas = filtroNivel === 0
    ? zonas
    : zonas.filter((z) => z.nivel === filtroNivel);

  const totalIncidentes = zonasFiltradas.reduce((s, z) => s + z.incidentes, 0);

  return (
    <View style={[styles.container, style]}>
      {/* Mapa */}
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={ESCOM_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Círculo del campus */}
        <Circle
          center={{ latitude: ESCOM_REGION.latitude, longitude: ESCOM_REGION.longitude }}
          radius={550}
          strokeColor={`${COLORS.primary}40`}
          fillColor={`${COLORS.primary}06`}
          strokeWidth={1.5}
        />

        {/* Zonas de calor */}
        {zonasFiltradas.map((zona) => {
          const cfg = NIVEL_CONFIG[zona.nivel];
          return (
            <React.Fragment key={zona.id}>
              <Circle
                center={{ latitude: zona.lat, longitude: zona.lng }}
                radius={zona.radio}
                strokeColor={hexToRgba(cfg.color, cfg.strokeOpacity)}
                fillColor={hexToRgba(cfg.color, zona.id === zonaSeleccionada?.id ? cfg.fillOpacity * 1.8 : cfg.fillOpacity)}
                strokeWidth={zona.id === zonaSeleccionada?.id ? 2 : 1.2}
              />
              <Marker
                coordinate={{ latitude: zona.lat, longitude: zona.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={() => setZonaSeleccionada(
                  zonaSeleccionada?.id === zona.id ? null : zona
                )}
              >
                <View style={[styles.markerBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                  <Text style={[styles.markerCount, { color: cfg.color }]}>
                    {zona.incidentes}
                  </Text>
                </View>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Barra superior */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>🔥 Mapa de Calor</Text>
          <Text style={styles.topBarSub}>ESCOM · {totalIncidentes} incidentes registrados</Text>
        </View>
      </View>

      {/* Filtros de nivel */}
      <View style={styles.nivelFiltros}>
        {[
          { valor: 0, label: 'Todos' },
          { valor: 1, label: 'Bajo'  },
          { valor: 2, label: 'Medio' },
          { valor: 3, label: 'Alto'  },
        ].map((f) => {
          const activo = filtroNivel === f.valor;
          const cfg    = f.valor > 0 ? NIVEL_CONFIG[f.valor] : null;
          return (
            <TouchableOpacity
              key={f.valor}
              style={[
                styles.nivelChip,
                activo && { backgroundColor: cfg?.bg ?? COLORS.primaryBg, borderColor: cfg?.color ?? COLORS.primary },
              ]}
              onPress={() => setFiltroNivel(f.valor)}
              activeOpacity={0.7}
            >
              {cfg && <View style={[styles.nivelDot, { backgroundColor: cfg.color }]} />}
              <Text style={[
                styles.nivelChipText,
                activo && { color: cfg?.color ?? COLORS.primary, fontWeight: TYPOGRAPHY.fontSemibold },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Panel de zona seleccionada */}
      {zonaSeleccionada && (
        <View style={styles.zonaPanel}>
          <View style={styles.zonaPanelHeader}>
            <View style={[
              styles.zonaNivel,
              { backgroundColor: NIVEL_CONFIG[zonaSeleccionada.nivel].bg },
            ]}>
              <View style={[
                styles.zonaNivelDot,
                { backgroundColor: NIVEL_CONFIG[zonaSeleccionada.nivel].color },
              ]} />
              <Text style={[
                styles.zonaNivelText,
                { color: NIVEL_CONFIG[zonaSeleccionada.nivel].color },
              ]}>
                Riesgo {NIVEL_CONFIG[zonaSeleccionada.nivel].label}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setZonaSeleccionada(null)}>
              <Text style={styles.panelCerrar}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.zonaNombre}>{zonaSeleccionada.nombre}</Text>
          <Text style={styles.zonaDesc}>{zonaSeleccionada.descripcion}</Text>
          <View style={styles.zonaStats}>
            <View style={styles.zonaStatItem}>
              <Text style={styles.zonaStatNum}>{zonaSeleccionada.incidentes}</Text>
              <Text style={styles.zonaStatLabel}>Incidentes</Text>
            </View>
            <View style={styles.zonaStatDivider} />
            <View style={styles.zonaStatItem}>
              <Text style={styles.zonaStatNum}>{zonaSeleccionada.radio}m</Text>
              <Text style={styles.zonaStatLabel}>Radio vigilado</Text>
            </View>
          </View>
        </View>
      )}

      {/* Leyenda */}
      <View style={styles.leyenda}>
        {Object.entries(NIVEL_CONFIG).map(([nivel, cfg]) => (
          <View key={nivel} style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: cfg.color }]} />
            <Text style={styles.leyendaText}>{cfg.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    overflow:        'hidden',
    borderRadius:    RADIUS.lg,
    borderWidth:     1,
    borderColor:     COLORS.border,
    backgroundColor: COLORS.bgCardAlt,
    minHeight:       280,
    ...SHADOW.card,
  },
  map: {
    flex:      1,
    minHeight: 280,
  },

  // Top bar
  topBar: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    backgroundColor: 'rgba(255,255,255,0.93)',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
  },
  topBarTitle: {
    fontSize:   TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.fontSemibold,
    color:      COLORS.textPrimary,
  },
  topBarSub: {
    fontSize: TYPOGRAPHY.xs - 1,
    color:    COLORS.textMuted,
  },

  // Filtros de nivel
  nivelFiltros: {
    position:          'absolute',
    top:               44,
    left:              SPACING.sm,
    flexDirection:     'row',
    gap:               SPACING.xs,
  },
  nivelChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   'rgba(255,255,255,0.92)',
    borderRadius:      RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       COLORS.border,
  },
  nivelDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  nivelChipText: {
    fontSize:   TYPOGRAPHY.xs,
    color:      COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontMedium,
  },

  // Marcador con conteo
  markerBadge: {
    width:        24,
    height:       24,
    borderRadius: 12,
    borderWidth:  1.5,
    alignItems:   'center',
    justifyContent: 'center',
  },
  markerCount: {
    fontSize:   10,
    fontWeight: TYPOGRAPHY.fontBold,
  },

  // Panel zona seleccionada
  zonaPanel: {
    position:          'absolute',
    bottom:            40,
    left:              SPACING.sm,
    right:             SPACING.sm,
    backgroundColor:   'rgba(255,255,255,0.97)',
    borderRadius:      RADIUS.lg,
    padding:           SPACING.md,
    borderWidth:       1,
    borderColor:       COLORS.border,
    ...SHADOW.card,
  },
  zonaPanelHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SPACING.xs,
  },
  zonaNivel: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    borderRadius:      RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   2,
  },
  zonaNivelDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  zonaNivelText: {
    fontSize:   TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.fontBold,
  },
  panelCerrar: {
    color:    COLORS.textMuted,
    fontSize: 14,
    padding:  2,
  },
  zonaNombre: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontSemibold,
    color:      COLORS.textPrimary,
    marginBottom: 2,
  },
  zonaDesc: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  zonaStats: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            SPACING.lg,
  },
  zonaStatItem: {
    alignItems: 'center',
  },
  zonaStatNum: {
    fontSize:   TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.fontBold,
    color:      COLORS.textPrimary,
  },
  zonaStatLabel: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textMuted,
  },
  zonaStatDivider: {
    width:  1,
    height: 30,
    backgroundColor: COLORS.border,
  },

  // Leyenda
  leyenda: {
    position:          'absolute',
    bottom:            SPACING.sm,
    right:             SPACING.sm,
    backgroundColor:   'rgba(255,255,255,0.92)',
    borderRadius:      RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   SPACING.xs,
    gap:               3,
    borderWidth:       1,
    borderColor:       COLORS.border,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  leyendaDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  leyendaText: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textSecondary,
    fontWeight: '500',
  },
});

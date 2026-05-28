/**
 * HeatMapPanel
 * RF2 — Mapa de calor de incidentes
 * Muestra zonas de riesgo del campus ESCOM-IPN con datos mock.
 * Sin backend: usa coordenadas reales del campus Zacatenco.
 *
 * Dependencia: react-native-maps (ya usada en MapPanel)
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOW, ESCOM_REGION } from '../constants/theme';
import api from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ALERT_CLUSTER_RADIUS_METERS = 200;
const ALERT_CLUSTER_BASE_RADIUS = 40;
const ALERT_CLUSTER_FACTOR = 20;

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function HeatMapPanel({ style }) {
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [alertas, setAlertas] = useState([]);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);

  // Cargar alertas activas desde la API
  useEffect(() => {
    api.getAlertas({ estado: 'activa' })
      .then(res => {
        const mapeadas = (res.alerts || []).map(a => ({
          id: a.id,
          titulo: a.titulo,
          estado: a.estado,
          lat: parseFloat(a.latitud),
          lng: parseFloat(a.longitud),
          createdAt: a.createdAt,
        }));
        setAlertas(mapeadas);
      })
      .catch(err => console.error('Error cargando alertas:', err));
  }, []);

  // Cargar reportes pendientes desde la API
  useEffect(() => {
    api.getReportes({ estado: 'pendiente', limit: 50 })
      .then(res => {
        const mapeadas = (res.reports || []).map(r => ({
          id: r.id,
          titulo: r.titulo,
          categoria: r.categoria,
          estado: r.estado,
          ubicacionTexto: r.ubicacionTexto,
          lat: parseFloat(r.latitud),
          lng: parseFloat(r.longitud),
          createdAt: r.createdAt,
        }));
        setReportes(mapeadas);
      })
      .catch(err => console.error('Error cargando reportes:', err));
  }, []);

  const mostrarAlertas = filtroTipo === 'todos' || filtroTipo === 'alertas';
  const mostrarReportes = filtroTipo === 'todos' || filtroTipo === 'reportes';

  const alertClusters = useMemo(() => {
    if (!alertas.length) return [];
    const clusters = [];

    alertas.forEach((alerta) => {
      const punto = { lat: alerta.lat, lng: alerta.lng };
      let asignado = null;

      for (const cluster of clusters) {
        const dist = distanceMeters(punto, { lat: cluster.lat, lng: cluster.lng });
        if (dist <= ALERT_CLUSTER_RADIUS_METERS) {
          asignado = cluster;
          break;
        }
      }

      if (!asignado) {
        clusters.push({
          id: `cluster-${alerta.id}`,
          lat: punto.lat,
          lng: punto.lng,
          alertas: [alerta],
        });
      } else {
        asignado.alertas.push(alerta);
        const total = asignado.alertas.length;
        asignado.lat = (asignado.lat * (total - 1) + punto.lat) / total;
        asignado.lng = (asignado.lng * (total - 1) + punto.lng) / total;
      }
    });

    return clusters.map((cluster) => ({
      ...cluster,
      radio: ALERT_CLUSTER_BASE_RADIUS + ALERT_CLUSTER_FACTOR * cluster.alertas.length,
    }));
  }, [alertas]);

  const totalAlertas = alertas.length;

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

        {/* Zonas de alertas SOS (clusters) */}
        {mostrarAlertas && alertClusters.map((cluster) => (
          <React.Fragment key={cluster.id}>
            <Circle
              center={{ latitude: cluster.lat, longitude: cluster.lng }}
              radius={cluster.radio}
              strokeColor={hexToRgba(COLORS.statusDanger, 0.55)}
              fillColor={hexToRgba(COLORS.statusDanger, 0.22)}
              strokeWidth={1.4}
            />
            <Marker
              coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => setAlertaSeleccionada({
                id: cluster.id,
                titulo: `${cluster.alertas.length} alerta${cluster.alertas.length === 1 ? '' : 's'} SOS`,
                estado: 'activa',
              })}
            >
              <View style={styles.alertClusterBadge}>
                <Text style={styles.alertClusterText}>{cluster.alertas.length}</Text>
              </View>
            </Marker>
          </React.Fragment>
        ))}

        {/* Alertas activas */}
        {mostrarAlertas && alertas.map((alerta) => (
          <Marker
            key={`alert-${alerta.id}`}
            coordinate={{ latitude: alerta.lat, longitude: alerta.lng }}
            onPress={() => setAlertaSeleccionada(
              alertaSeleccionada?.id === alerta.id ? null : alerta
            )}
          >
            <View style={styles.alertaBadge}>
              <Text style={styles.alertaBadgeText}>SOS</Text>
            </View>
          </Marker>
        ))}

        {/* Reportes pendientes */}
        {mostrarReportes && reportes.map((reporte) => (
          <Marker
            key={`report-${reporte.id}`}
            coordinate={{ latitude: reporte.lat, longitude: reporte.lng }}
            onPress={() => setReporteSeleccionado(
              reporteSeleccionado?.id === reporte.id ? null : reporte
            )}
          >
            <View style={styles.reporteBadge}>
              <Text style={styles.reporteBadgeText}>REP</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Barra superior */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>🔥 Mapa de Calor</Text>
          <Text style={styles.topBarSub}>ESCOM · {totalAlertas} alertas SOS activas</Text>
        </View>
      </View>

      {/* Filtros de tipo */}
      <View style={styles.nivelFiltros}>
        {[
          { valor: 'todos', label: 'Todos', color: COLORS.primary },
          { valor: 'reportes', label: 'Reportes', color: COLORS.statusWarn },
          { valor: 'alertas', label: 'Alertas', color: COLORS.statusDanger },
        ].map((f) => {
          const activo = filtroTipo === f.valor;
          return (
            <TouchableOpacity
              key={f.valor}
              style={[
                styles.nivelChip,
                activo && { backgroundColor: `${f.color}1A`, borderColor: f.color },
              ]}
              onPress={() => setFiltroTipo(f.valor)}
              activeOpacity={0.7}
            >
              <View style={[styles.nivelDot, { backgroundColor: f.color }]} />
              <Text style={[
                styles.nivelChipText,
                activo && { color: f.color, fontWeight: TYPOGRAPHY.fontSemibold },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Panel de alerta seleccionada */}
      {alertaSeleccionada && (
        <View style={styles.alertaPanel}>
          <View style={styles.alertaPanelHeader}>
            <Text style={styles.alertaTitulo}>{alertaSeleccionada.titulo || 'Alerta SOS'}</Text>
            <TouchableOpacity onPress={() => setAlertaSeleccionada(null)}>
              <Text style={styles.panelCerrar}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.alertaEstado}>Estado: {alertaSeleccionada.estado}</Text>
        </View>
      )}

      {/* Panel de reporte seleccionado */}
      {reporteSeleccionado && (
        <View style={styles.reportePanel}>
          <View style={styles.reportePanelHeader}>
            <Text style={styles.reporteTitulo}>{reporteSeleccionado.titulo || 'Reporte'}</Text>
            <TouchableOpacity onPress={() => setReporteSeleccionado(null)}>
              <Text style={styles.panelCerrar}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.reporteMeta}>Categoria: {reporteSeleccionado.categoria}</Text>
          <Text style={styles.reporteMeta}>Estado: {reporteSeleccionado.estado}</Text>
          {!!reporteSeleccionado.ubicacionTexto && (
            <Text style={styles.reporteMeta}>Ubicacion: {reporteSeleccionado.ubicacionTexto}</Text>
          )}
        </View>
      )}

      {/* Leyenda */}
      <View style={styles.leyenda}>
        <View style={styles.leyendaItem}>
          <View style={[styles.leyendaDot, { backgroundColor: COLORS.statusDanger }]} />
          <Text style={styles.leyendaText}>Alertas SOS</Text>
        </View>
        <View style={styles.leyendaItem}>
          <View style={[styles.leyendaDot, { backgroundColor: COLORS.statusWarn }]} />
          <Text style={styles.leyendaText}>Reportes</Text>
        </View>
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

  // Marcador de cluster de alertas
  alertClusterBadge: {
    width:        26,
    height:       26,
    borderRadius: 13,
    borderWidth:  1.5,
    borderColor:  COLORS.statusDanger,
    backgroundColor: COLORS.statusDangerBg,
    alignItems:   'center',
    justifyContent: 'center',
  },
  alertClusterText: {
    fontSize:   10,
    fontWeight: TYPOGRAPHY.fontBold,
    color:      COLORS.statusDanger,
  },

  // Marcador de alerta
  alertaBadge: {
    backgroundColor: COLORS.statusDanger,
    borderRadius:    14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.statusDanger,
  },
  alertaBadgeText: {
    color:      '#fff',
    fontSize:   10,
    fontWeight: TYPOGRAPHY.fontBold,
    letterSpacing: 0.3,
  },

  // Marcador de reporte
  reporteBadge: {
    backgroundColor: COLORS.statusWarn,
    borderRadius:    14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.statusWarn,
  },
  reporteBadgeText: {
    color:      '#fff',
    fontSize:   10,
    fontWeight: TYPOGRAPHY.fontBold,
    letterSpacing: 0.3,
  },

  panelCerrar: {
    color:    COLORS.textMuted,
    fontSize: 14,
    padding:  2,
  },

  // Panel de alerta
  alertaPanel: {
    position:          'absolute',
    bottom:            40,
    left:              SPACING.sm,
    right:             SPACING.sm,
    backgroundColor:   'rgba(255,255,255,0.97)',
    borderRadius:      RADIUS.lg,
    padding:           SPACING.md,
    borderWidth:       1,
    borderColor:       COLORS.statusDanger,
    ...SHADOW.card,
  },
  alertaPanelHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SPACING.xs,
  },
  alertaTitulo: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontSemibold,
    color:      COLORS.statusDanger,
  },
  alertaEstado: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textSecondary,
  },

  // Panel de reporte
  reportePanel: {
    position:          'absolute',
    bottom:            40,
    left:              SPACING.sm,
    right:             SPACING.sm,
    backgroundColor:   'rgba(255,255,255,0.97)',
    borderRadius:      RADIUS.lg,
    padding:           SPACING.md,
    borderWidth:       1,
    borderColor:       COLORS.statusWarn,
    ...SHADOW.card,
  },
  reportePanelHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SPACING.xs,
  },
  reporteTitulo: {
    fontSize:   TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.fontSemibold,
    color:      COLORS.statusWarn,
  },
  reporteMeta: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textSecondary,
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

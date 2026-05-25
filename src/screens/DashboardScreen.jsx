/**
 * src/screens/DashboardScreen.jsx
 *
 * Dashboard principal con navegaciÃ³n adaptable:
 *   - Portrait/mÃ³vil: tab bar inferior (5 tabs, incluye Perfil)
 *   - Landscape/tablet: sidebar lateral + header con avatar de perfil
 *
 * Secciones: map | feed | report | net | profile
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../services/api';
import { NetworkScreen } from './NetworkScreen';

import { useAuth }           from '../context/AuthContext';
import { useMesh }           from '../hooks/useMesh';
import { useOrientation }    from '../hooks/useOrientation';
import { HeatMapPanel }      from '../components/HeatMapPanel';
import { PanicButton }       from '../components/PanicButton';
import { Sidebar }           from '../components/Sidebar';
import { GuestBanner }       from '../components/GuestBanner';
import { FeedScreen }        from '../screens/FeedScreen';
import { ProfileScreen }     from '../screens/ProfileScreen';
import { CreateReportModal } from '../components/CreateReportModal';
import {
  AlertCard,
  CampusStatusCard,
  CommunityCard,
  Divider,
  LogLine,
  ReportItem,
  SectionHeader,
  StatCard,
  StatusBadge,
} from '../components/UIElements';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOW } from '../constants/theme';

const MOBILE_TABS = [
  { id: 'map',     icon: 'map',              label: 'Mapa'     },
  { id: 'feed',    icon: 'forum',            label: 'Feed'     },
  { id: 'report',  icon: 'add-circle',       label: 'Reportar' },
  { id: 'net',     icon: 'wifi-tethering',   label: 'Red'      },
  { id: 'profile', icon: 'account-circle',   label: 'Perfil'   },
];

function HeaderAvatar({ user, guestMode, onPress }) {
  const initials = guestMode
    ? '?'
    : (user?.nombre ?? 'E')
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

  return (
    <TouchableOpacity style={headerAv.wrap} onPress={onPress} activeOpacity={0.8}>
      <View style={[headerAv.avatar, guestMode && headerAv.avatarGuest]}>
        <Text style={headerAv.initials}>{initials}</Text>
      </View>
      {!guestMode && <View style={headerAv.onlineDot} />}
    </TouchableOpacity>
  );
}

const headerAv = StyleSheet.create({
  wrap:   { position: 'relative' },
  avatar: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    borderColor:     COLORS.primaryMuted,
  },
  avatarGuest: {
    backgroundColor: COLORS.bgCardAlt,
    borderColor:     COLORS.border,
  },
  initials: {
    color:         '#FFF',
    fontSize:      TYPOGRAPHY.sm,
    fontWeight:    TYPOGRAPHY.fontBold,
    letterSpacing: 0.5,
  },
  onlineDot: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: COLORS.statusOk,
    borderWidth:     2,
    borderColor:     COLORS.bgSurface,
  },
});

function TopHeader({ user, guestMode, ready, starting, onProfilePress }) {
  return (
    <View style={hdSt.header}>
      {/* Identidad */}
      <View style={hdSt.left}>
        <View style={hdSt.logo}>
          <Text style={hdSt.logoText}>SS</Text>
        </View>
        <View>
          <Text style={hdSt.appName}>SSEGURO</Text>
          <Text style={hdSt.appSub}>ESCOM Â· IPN</Text>
        </View>
      </View>

      {/* Centro â€” estado campus */}
      <View style={hdSt.center}>
        <MaterialIcons name="notifications" size={16} color={COLORS.textMuted} />
        <Text style={hdSt.centerText}>Vigilancia en Tiempo Real</Text>
        <Text style={hdSt.centerSub}>  CAMPUS ZACATENCO Â· ESCOM</Text>
      </View>

      {/* Derecha â€” usuario + avatar */}
      <TouchableOpacity style={hdSt.right} onPress={onProfilePress} activeOpacity={0.8}>
        <View style={hdSt.userInfo}>
          <Text style={hdSt.userName} numberOfLines={1}>
            {guestMode ? 'Invitado' : (user?.nombre ?? 'Estudiante IPN')}
          </Text>
          <Text style={hdSt.userBoleta} numberOfLines={1}>
            {user?.boleta ?? 'â€”'}
          </Text>
        </View>
        <HeaderAvatar user={user} guestMode={guestMode} onPress={onProfilePress} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Helper de tiempo ──────────────────────────────────────────────────────────
function tiempoRelativo(iso) {
  if (!iso) return 'Fecha desconocida';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 'Hace un momento';

  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Hace ${hrs} hr${hrs > 1 ? 's' : ''}`;
  const dias = Math.floor(hrs / 24);
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

const hdSt = StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: SPACING.base,
    paddingVertical:   SPACING.sm,
    backgroundColor:   COLORS.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap:               SPACING.sm,
    ...SHADOW.card,
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    minWidth:      140,
  },
  logo: {
    width:           32,
    height:          32,
    borderRadius:    RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  logoText: {
    color:         '#FFF',
    fontSize:      TYPOGRAPHY.sm,
    fontWeight:    TYPOGRAPHY.fontBold,
    letterSpacing: 1,
  },
  appName: {
    fontSize:      TYPOGRAPHY.sm,
    fontWeight:    TYPOGRAPHY.fontBold,
    color:         COLORS.textPrimary,
    letterSpacing: 1.5,
  },
  appSub: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textMuted,
  },
  center: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent:'center',
    gap:           4,
  },
  centerText: {
    fontSize:   TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.fontSemibold,
    color:      COLORS.textSecondary,
  },
  centerSub: {
    fontSize: TYPOGRAPHY.xs,
    color:    COLORS.textMuted,
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    minWidth:      140,
    justifyContent:'flex-end',
  },
  userInfo: { alignItems: 'flex-end' },
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
});

export function DashboardScreen() {
  const { user, guestMode, logout } = useAuth();
  const mesh   = useMesh();
  const layout = useOrientation();
  const isWide = layout.isLandscape || layout.isTablet;

  // Estados para datos reales
  const [reportes, setReportes] = useState([]);
  const [stats, setStats] = useState({ reportes: 0, cobertura: 0 });
  const [section,      setSection]      = useState('map');
  const [modalVisible, setModalVisible] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      // 1. Obtener reportes reales de la API
      const res = await api.getReportes({ limit: 3 });
      setReportes(res.reports || []);

      // 2. Calcular % seguridad: 
      // Ejemplo: Basado en alertas de red (mesh) y reportes activos
      const alertasNivel = mesh.alerts.length;
      const seguridad = Math.max(0, 100 - (alertasNivel * 10)); // Lógica de ejemplo
      setStats({ 
        reportes: res.pagination?.total || 0, 
        cobertura: seguridad 
      });
    } catch (e) {
      console.error("Error cargando dashboard:", e);
    }
  }, [mesh.alerts.length]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Abrir modal al tocar "Reportar"
  useEffect(() => {
    if (section === 'report' && !guestMode) {
      setModalVisible(true);
    }
  }, [section, guestMode]);

  const renderSection = () => {

    const numColumns = isWide ? 2 : 1;

    switch (section) {

      case 'map':
        return (
          <ScrollView
            style={styles.scrollBase}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <HeatMapPanel style={[styles.map, { height: isWide ? 500 : 340 }]} />

            <PanicButton
              onPress={mesh.sendPanic}
              disabled={!mesh.ready}
              sent={mesh.panicSent}
              guestMode={guestMode}
            />

            <View style={[styles.dashCards, { flexDirection: isWide ? 'row' : 'column' }]}>
              <CampusStatusCard 
                level={stats.cobertura > 80 ? 1 : 2} 
                coverage={stats.cobertura} 
              />
              <CommunityCard count={stats.reportes} />
            </View>

            <View style={styles.reportsCard}>
              <Text style={styles.cardTitle}>Últimos Reportes</Text>
              <Divider />
              {reportes.map((r) => (
                <ReportItem
                  key={r.id}
                  icon={r.categoria === 'emergencia_medica' ? '🚨' : '📝'}
                  title={r.titulo}
                  time={tiempoRelativo(r.createdAt)} // Usa tu helper existente
                  location={r.ubicacionTexto}
                  dot={r.estado === 'pendiente' ? COLORS.statusDanger : COLORS.statusOk}
                />
              ))}
            </View>

            <View style={styles.statsRow}>
              <StatCard
                label="Dispositivos"
                value={String(mesh.connectedCount)}
                accent={mesh.connectedCount > 0}
              />
              <StatCard
                label="Alertas"
                value={String(mesh.alerts.length)}
                accent={mesh.alerts.length > 0}
              />
            </View>

            {mesh.alerts.length > 0 && (
              <View>
                <SectionHeader title="Alertas de red" badge={mesh.alerts.length} />
                {mesh.alerts.map((a) => <AlertCard key={a.alertId} alert={a} />)}
              </View>
            )}
          </ScrollView>
        );

      case 'feed':
        return (
          <FeedScreen
            style={{ flex: 1 }}
            guestMode={guestMode}
            onNewReport={() => { if (!guestMode) setModalVisible(true); }}
          />
        );

      // 'report' no renderiza contenido; el modal se abre por useEffect
      case 'report':
        return (
          <FeedScreen
            style={{ flex: 1 }}
            guestMode={guestMode}
            onNewReport={() => { if (!guestMode) setModalVisible(true); }}
          />
        );

      case 'net':
        return (
          <ScrollView
            style={styles.scrollBase}
            contentContainerStyle={[styles.scrollContent, isWide && { padding: SPACING.xl }]}
            showsVerticalScrollIndicator={false}
          >
            {<NetworkScreen guestMode={guestMode} />}
          </ScrollView>
        );

      case 'profile':
        return (
          <ProfileScreen
            meshNodeId={mesh.nodeId}
            meshReady={mesh.ready}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgBase} translucent={false} />

      {/* Guest banner */}
      {guestMode && <GuestBanner onLoginPress={logout} />}

      {/* Header con avatar â€” solo en landscape/tablet */}
      {isWide && (
        <TopHeader
          user={user}
          guestMode={guestMode}
          ready={mesh.ready}
          starting={mesh.starting}
          onProfilePress={() => setSection('profile')}
        />
      )}

      {/* Header mÃ³vil â€” secciÃ³n activa + avatar */}
      {!isWide && (
        <View style={styles.mobileHeader}>
          <Text style={styles.mobileHeaderTitle}>
            {MOBILE_TABS.find((t) => t.id === section)?.label ?? 'SSEGURO'}
          </Text>
          <View style={styles.mobileHeaderRight}>
            <StatusBadge ready={mesh.ready} starting={mesh.starting} />
            <HeaderAvatar
              user={user}
              guestMode={guestMode}
              onPress={() => setSection('profile')}
            />
          </View>
        </View>
      )}

      <View style={styles.body}>
        {/* Sidebar â€” landscape/tablet */}
        {isWide && (
          <Sidebar
            activeSection={section}
            onSectionChange={setSection}
            user={user}
            guestMode={guestMode}
          />
        )}

        <View style={[styles.main, isWide && styles.mainWide]}>
          {renderSection()}
        </View>
      </View>

      {/* Tab bar mÃ³vil */}
      {!isWide && (
        <View style={[styles.tabBar, Platform.OS === 'ios' && { paddingBottom: SPACING.md }]}>
          {MOBILE_TABS.map((tab) => {
            const active = section === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => setSection(tab.id)}
                activeOpacity={0.7}
              >
                {/* Indicador activo */}
                {active && <View style={styles.tabIndicator} />}
                <MaterialIcons
                  name={tab.icon}
                  size={22}
                  color={active ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <CreateReportModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setSection('feed'); }}
        onSubmit={(data) => {
          setModalVisible(false);
          setSection('feed');
          console.log('Nuevo reporte:', data);
        }}
        guestMode={guestMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: COLORS.bgBase,
  },

  // Header mÃ³vil
  mobileHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical:   SPACING.sm,
    backgroundColor:   COLORS.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mobileHeaderTitle: {
    fontSize:      TYPOGRAPHY.lg,
    fontWeight:    TYPOGRAPHY.fontBold,
    color:         COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
  },

  body: {
    flex:          1,
    flexDirection: 'row',
  },
  main: { 
    flex: 1,
    maxWidth: 1200, // Evita que en tablets gigantes se vea deforme
    alignSelf: 'center', // Centra el contenido en pantallas muy anchas
    width: '100%',
  },

  scrollBase:    { flex: 1 },
  scrollContent: {
    padding: SPACING.base, 
    paddingBottom: SPACING.xxl,
  },

  map: {
    height:        340,
    marginBottom:  SPACING.md,
    borderRadius:  RADIUS.lg,
    overflow:      'hidden',
  },

  dashCards: {
    flexDirection: 'row',
    gap:           SPACING.md,
    marginBottom:  SPACING.md,
  },

  reportsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.lg,
    marginBottom:    SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    ...SHADOW.card,
  },
  cardTitle: {
    fontSize:     TYPOGRAPHY.base,
    fontWeight:   TYPOGRAPHY.fontSemibold,
    color:        COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  statsRow: {
    flexDirection: 'row',
    gap:           SPACING.sm,
    marginBottom:  SPACING.md,
  },

  sectionHeading: {
    fontSize:     TYPOGRAPHY.xl,
    fontWeight:   TYPOGRAPHY.fontBold,
    color:        COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emptyText: {
    color:     COLORS.textMuted,
    fontSize:  TYPOGRAPHY.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.xl,
  },

  // Tab bar
  tabBar: {
    flexDirection:   'row',
    borderTopWidth:  1,
    borderTopColor:  COLORS.border,
    backgroundColor: COLORS.bgSurface,
    paddingBottom:   SPACING.xs,
    ...SHADOW.card,
  },
  tabItem: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    position:       'relative',
    gap:            2,
  },
  tabIndicator: {
    position:        'absolute',
    top:             0,
    width:           28,
    height:          3,
    borderRadius:    2,
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    fontSize:  TYPOGRAPHY.xs,
    color:     COLORS.textMuted,
    fontWeight: TYPOGRAPHY.fontMedium,
  },
  tabLabelActive: {
    color:      COLORS.primary,
    fontWeight: TYPOGRAPHY.fontBold,
  },
});

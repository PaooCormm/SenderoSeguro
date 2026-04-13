import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import NearbyMesh from './src/services/NearbyMesh';

function createNodeId() {
  return `node-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const nodeId = useMemo(() => createNodeId(), []);
  const [ready, setReady] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const log = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 120));
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Solo Android', 'Esta fase 1 está preparada solo para Android.');
      return false;
    }

    const perms = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,

    ];

    if (Platform.Version >= 33) {
      if (PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES) {
        perms.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
      }
      perms.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
    } else if (Platform.Version >= 31) {
      perms.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );
    } else {
      perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    }

    const result = await PermissionsAndroid.requestMultiple(perms);
    const denied = Object.entries(result).filter(
      ([, value]) => value !== PermissionsAndroid.RESULTS.GRANTED
    );

    if (denied.length > 0) {
      denied.forEach(([key]) => log(`Permiso no concedido: ${key}`));
      return false;
    }

    return true;
  };

  const [starting, setStarting] = useState(false);

  const startMesh = async () => {
    if (starting || ready) return;

    setStarting(true);
    try {
      const ok = await requestPermissions();
      if (!ok) {
        log('No se pudo iniciar la red local por permisos faltantes.');
        return;
      }

      await NearbyMesh.stopMesh().catch(() => {});
      await NearbyMesh.startMesh(nodeId);
      setReady(true);
      log(`Red local activa. Mi nodeId: ${nodeId}`);
    } catch (e) {
      log(`Error al iniciar red local: ${e?.message ?? String(e)}`);
    } finally {
      setStarting(false);
    }
  };

  const stopMesh = async () => {
    try {
      await NearbyMesh.stopMesh();
      setReady(false);
      setConnectedCount(0);
      log('Red local detenida.');
    } catch (e) {
      log(`Error al detener red local: ${e?.message ?? String(e)}`);
    }
  };

  const sendPanic = async () => {
    const payload = {
      type: 'PANIC',
      alertId: `${nodeId}-${Date.now()}`,
      from: nodeId,
      timestamp: Date.now(),
    };

    try {
      await NearbyMesh.sendAlert(payload);
      log(`Alerta emitida: ${payload.alertId}`);
    } catch (e) {
      log(`Error al enviar alerta: ${e?.message ?? String(e)}`);
    }
  };

  useEffect(() => {
    const subs = [
      NearbyMesh.addListener('mesh_started', (event) => {
        log(`Mesh iniciado con serviceId: ${event?.serviceId}`);
      }),
      NearbyMesh.addListener('endpoint_found', (event) => {
        log(`Encontrado: ${event?.endpointName} (${event?.endpointId})`);
      }),
      NearbyMesh.addListener('connection_result', (event) => {
        setConnectedCount(event?.connectedCount ?? 0);
        log(
          event?.success
            ? `Conectado con ${event?.endpointId}. Total: ${event?.connectedCount}`
            : `Falló conexión con ${event?.endpointId}`
        );
      }),
      NearbyMesh.addListener('endpoint_disconnected', (event) => {
        setConnectedCount(event?.connectedCount ?? 0);
        log(`Desconectado ${event?.endpointId}. Total: ${event?.connectedCount}`);
      }),
      NearbyMesh.addListener('payload_received', (event) => {
        try {
          const alert = JSON.parse(event?.payload ?? '{}');
          if (alert?.type === 'PANIC') {
            setAlerts((prev) => [alert, ...prev].slice(0, 20));
            log(`ALERTA recibida de ${alert?.from}`);
          }
        } catch (e) {
          log(`Payload inválido recibido: ${event?.payload}`);
        }
      }),
      NearbyMesh.addListener('native_error', (event) => {
        log(`Error nativo: ${event?.message}`);
      }),
    ];

    startMesh();

    return () => {
      subs.forEach((s) => s?.remove?.());
      NearbyMesh.stopMesh().catch(() => {});
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panic Mesh — Fase 1</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Estado</Text>
        <Text style={styles.value}>{ready ? 'Activo' : 'Inactivo'}</Text>

        <Text style={styles.label}>Node ID</Text>
        <Text style={styles.mono}>{nodeId}</Text>

        <Text style={styles.label}>Dispositivos conectados</Text>
        <Text style={styles.value}>{connectedCount}</Text>
      </View>

      <TouchableOpacity
        style={[styles.panicButton, !ready && styles.disabled]}
        onPress={sendPanic}
        disabled={!ready}
      >
        <Text style={styles.panicText}>BOTÓN DE PÁNICO</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={startMesh}>
          <Text style={styles.secondaryText}>Reiniciar red local</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={stopMesh}>
          <Text style={styles.secondaryText}>Detener</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alertas recibidas</Text>
        <ScrollView style={styles.list}>
          {alerts.length === 0 ? (
            <Text style={styles.empty}>Sin alertas todavía.</Text>
          ) : (
            alerts.map((a) => (
              <View key={a.alertId} style={styles.alertCard}>
                <Text style={styles.alertTitle}>Alerta de pánico</Text>
                <Text style={styles.alertLine}>De: {a.from}</Text>
                <Text style={styles.alertLine}>ID: {a.alertId}</Text>
                <Text style={styles.alertLine}>
                  Hora: {new Date(a.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logs</Text>
        <ScrollView style={styles.list}>
          {logs.map((line, idx) => (
            <Text key={idx} style={styles.logLine}>
              {line}
            </Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 18,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#171a21',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    color: '#98a2b3',
    fontSize: 12,
    marginTop: 8,
  },
  value: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  mono: {
    color: '#d0d5dd',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  panicButton: {
    backgroundColor: '#b42318',
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  panicText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.45,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    flex: 1,
    marginTop: 6,
  },
  sectionTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  list: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 10,
  },
  empty: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  alertCard: {
    backgroundColor: '#1f2937',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  alertTitle: {
    color: '#fca5a5',
    fontWeight: '800',
    marginBottom: 6,
  },
  alertLine: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  logLine: {
    color: '#9ca3af',
    fontSize: 11,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
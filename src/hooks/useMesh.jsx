/**
 * src/hooks/useMesh.jsx
 *
 * Correcciones:
 *  - NativeLocationModule puede ser null en Expo Go → todas las llamadas
 *    usan optional chaining (?.) para no crashear
 *  - NativeEventEmitter solo se crea si el módulo existe
 *  - SafeAreaView deprecado no aplica aquí, pero se documenta
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NearbyMesh from '../services/NearbyMesh';
import { ESCOM_REGION } from '../constants/theme';

const { NativeLocationModule } = NativeModules;

// ─── Guard: indica si el módulo nativo está disponible ───────────────────────
// En Expo Go es null; en builds nativas (expo run:android) está presente.
const HAS_LOCATION_MODULE = !!NativeLocationModule;

function createNodeId() {
  return `node-${Math.random().toString(36).slice(2, 8)}`;
}

export function useMesh() {
  const [nodeId, setNodeId] = useState(null);

  const [ready,           setReady]           = useState(false);
  const [starting,        setStarting]        = useState(false);
  const [connectedCount,  setConnectedCount]  = useState(0);
  const [logs,            setLogs]            = useState([]);
  const [alerts,          setAlerts]          = useState([]);
  const [lastLocation,    setLastLocation]    = useState(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [mapRegion,       setMapRegion]       = useState(ESCOM_REGION);
  const [panicSent,       setPanicSent]       = useState(false);

  const hasCenteredRef  = useRef(false);
  const locationSubRef  = useRef(null);

  const log = useCallback((msg) => {
    const time = new Date().toLocaleTimeString('es-MX');
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 120));
  }, []);

  // ─── Permisos ────────────────────────────────────────────────────────────
  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
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
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      );
    } else if (Platform.Version >= 31) {
      perms.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      );
    }
    const result = await PermissionsAndroid.requestMultiple(perms);
    const denied = Object.entries(result).filter(
      ([, v]) => v !== PermissionsAndroid.RESULTS.GRANTED,
    );
    denied.forEach(([key]) => log(`Permiso denegado: ${key}`));
    return denied.length === 0;
  }, [log]);

  const ensureLocationPermission = useCallback(async () => {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      setLocationGranted(granted);
      if (!granted) log('Permiso de ubicación no concedido.');
      return granted;
    } catch (e) {
      log(`Error solicitando ubicación: ${e?.message ?? String(e)}`);
      return false;
    }
  }, [log]);

  // ─── Ubicación ────────────────────────────────────────────────────────────
  const getLastKnownLocation = useCallback(async () => {
    if (!HAS_LOCATION_MODULE) return null;
    try {
      const loc = await NativeLocationModule.getLastKnownLocation();
      if (loc) {
        return {
          coords: {
            latitude:  loc.latitude,
            longitude: loc.longitude,
            accuracy:  loc.accuracy,
          },
          timestamp: loc.timestamp,
        };
      }
    } catch (e) {
      log(`Error ubicación previa: ${e?.message ?? String(e)}`);
    }
    return null;
  }, [log]);

  const getFreshLocation = useCallback(async (timeoutMs = 2000) => {
    if (!HAS_LOCATION_MODULE) return null;
    try {
      const loc = await NativeLocationModule.getCurrentLocation(timeoutMs);
      return {
        coords: {
          latitude:  loc.latitude,
          longitude: loc.longitude,
          accuracy:  loc.accuracy,
        },
        timestamp: loc.timestamp,
      };
    } catch (_) {
      return null;
    }
  }, []);

  const centerOnLocation = useCallback((location) => {
    if (!location) return;
    setMapRegion({
      latitude:       location.coords.latitude,
      longitude:      location.coords.longitude,
      latitudeDelta:  0.008,
      longitudeDelta: 0.008,
    });
    hasCenteredRef.current = true;
  }, []);

  // ─── Mesh ─────────────────────────────────────────────────────────────────
  const startMesh = useCallback(async () => {
    if (!nodeId || starting || ready) return;
    setStarting(true);
    try {
      const ok = await requestPermissions();
      if (!ok) { log('No se pudo iniciar la red: permisos faltantes.'); return; }
      await NearbyMesh.stopMesh().catch(() => {});
      await NearbyMesh.startMesh(nodeId);
      setReady(true);
      log(`Red mesh activa. Node: ${nodeId}`);
    } catch (e) {
      log(`Error al iniciar red: ${e?.message ?? String(e)}`);
    } finally {
      setStarting(false);
    }
  }, [nodeId, starting, ready, requestPermissions, log]);

  const stopMesh = useCallback(async () => {
    try {
      await NearbyMesh.stopMesh();
      setReady(false);
      setConnectedCount(0);
      log('Red mesh detenida.');
    } catch (e) {
      log(`Error al detener red: ${e?.message ?? String(e)}`);
    }
  }, [log]);

  // ─── Pánico ───────────────────────────────────────────────────────────────
  const sendPanic = useCallback(async () => {
    let granted = locationGranted;
    if (!granted) granted = await ensureLocationPermission();

    let freshLocation = null;
    let fallback      = lastLocation;

    if (granted) {
      freshLocation = await getFreshLocation(2000);
      if (!freshLocation) log('Ubicación fresca no disponible, usando última conocida.');
      if (!fallback)      fallback = await getLastKnownLocation();
    }

    const chosen  = freshLocation ?? fallback;
    const payload = {
      type:      'PANIC',
      alertId:   `${nodeId}-${Date.now()}`,
      from:      nodeId,
      timestamp: Date.now(),
      location:  chosen
        ? {
            latitude:          chosen.coords.latitude,
            longitude:         chosen.coords.longitude,
            accuracy:          chosen.coords.accuracy,
            locationTimestamp: chosen.timestamp,
            source:            freshLocation ? 'fresh' : 'last_known',
          }
        : null,
    };

    try {
      await NearbyMesh.sendAlert(payload);
      log(`Alerta enviada: ${payload.alertId}`);
      setPanicSent(true);
      setTimeout(() => setPanicSent(false), 3000);
      if (chosen) {
        setLastLocation(chosen);
        if (!hasCenteredRef.current) centerOnLocation(chosen);
      }
    } catch (e) {
      log(`Error al enviar alerta: ${e?.message ?? String(e)}`);
    }
  }, [
    locationGranted, lastLocation, nodeId, log,
    ensureLocationPermission, getFreshLocation, getLastKnownLocation, centerOnLocation,
  ]);

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('mesh_node_id');
        if (saved) {
          if (mounted) setNodeId(saved);
          return;
        }
        const fresh = createNodeId();
        await AsyncStorage.setItem('mesh_node_id', fresh);
        if (mounted) setNodeId(fresh);
      } catch {
        const fallback = createNodeId();
        if (mounted) setNodeId(fallback);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!nodeId) return;
    const bootstrap = async () => {
      const granted = await ensureLocationPermission();
      if (!granted) return;

      // Solo usar NativeLocationModule si está disponible (no en Expo Go)
      if (!HAS_LOCATION_MODULE) {
        log('Módulo de ubicación nativo no disponible (Expo Go). Usando región ESCOM por defecto.');
        return;
      }

      const lastKnown = await getLastKnownLocation();
      if (lastKnown) {
        setLastLocation(lastKnown);
        if (!hasCenteredRef.current) centerOnLocation(lastKnown);
      }

      if (!locationSubRef.current) {
        try {
          const emitter = new NativeEventEmitter(NativeLocationModule);
          locationSubRef.current = emitter.addListener('location_update', (loc) => {
            if (!loc) return;
            setLastLocation({
              coords: {
                latitude:  loc.latitude,
                longitude: loc.longitude,
                accuracy:  loc.accuracy,
              },
              timestamp: loc.timestamp,
            });
          });
          await NativeLocationModule.startContinuousUpdates(2000, 2);
          log('Ubicación en tiempo real activa.');
        } catch (e) {
          log(`Error ubicación continua: ${e?.message ?? String(e)}`);
        }
      }
    };

    bootstrap();

    const subs = [
      NearbyMesh.addListener('endpoint_connected', (event) => {
        setConnectedCount(event?.connectedCount ?? 0);
        log(`Dispositivo conectado: ${event?.endpointId}. Total: ${event?.connectedCount}`);
      }),
      NearbyMesh.addListener('endpoint_disconnected', (event) => {
        setConnectedCount(event?.connectedCount ?? 0);
        log(`Desconectado: ${event?.endpointId}. Total: ${event?.connectedCount}`);
      }),
      NearbyMesh.addListener('payload_received', (event) => {
        try {
          const alert = JSON.parse(event?.payload ?? '{}');
          if (alert?.type === 'PANIC') {
            setAlerts((prev) => [alert, ...prev].slice(0, 20));
            log(`🆘 ALERTA recibida de ${alert?.from}`);
            if (!hasCenteredRef.current && alert?.location?.latitude) {
              setMapRegion({
                latitude:       alert.location.latitude,
                longitude:      alert.location.longitude,
                latitudeDelta:  0.008,
                longitudeDelta: 0.008,
              });
              hasCenteredRef.current = true;
            }
          }
        } catch (_) {
          log(`Payload inválido: ${event?.payload}`);
        }
      }),
      NearbyMesh.addListener('native_error', (event) => {
        log(`Error nativo: ${event?.message}`);
      }),
    ];

    startMesh();

    // ─── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      subs.forEach((s) => s?.remove?.());
      locationSubRef.current?.remove?.();
      locationSubRef.current = null;

      // ← Guarda: solo llamar si el módulo existe
      if (HAS_LOCATION_MODULE) {
        NativeLocationModule.stopContinuousUpdates().catch(() => {});
      }

      NearbyMesh.stopMesh().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  return {
    nodeId, ready, starting, connectedCount, logs, alerts,
    lastLocation, locationGranted, mapRegion, panicSent,
    startMesh, stopMesh, sendPanic, setMapRegion,
  };
}

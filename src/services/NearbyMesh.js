/**
 * src/services/NearbyMesh.js
 *
 * Puente JS → NearbyMeshModule nativo.
 * Corrige WARN: "NativeEventEmitter called without addListener/removeListeners"
 * El módulo Kotlin ya tiene esos métodos — aquí los exponemos correctamente.
 */
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { NearbyMeshModule } = NativeModules;

if (Platform.OS === 'android' && !NearbyMeshModule) {
  console.warn('[NearbyMesh] Módulo nativo no disponible. Ejecuta `npx expo run:android`.');
}

// ─── Emitter real ─────────────────────────────────────────────────────────────
// NativeEventEmitter requiere que el módulo exponga addListener y removeListeners.
// NearbyMeshModule.kt ya los tiene (@ReactMethod). Aquí lo pasamos directamente.
const emitter = NearbyMeshModule ? new NativeEventEmitter(NearbyMeshModule) : null;

// ─── Stub (cuando el módulo no está disponible) ───────────────────────────────
const stub = {
  startMesh:   async () => {},
  stopMesh:    async () => {},
  sendAlert:   async () => false,
  addListener: ()      => ({ remove: () => {} }),
};

// ─── API real ─────────────────────────────────────────────────────────────────
const real = {
  startMesh(nodeId) {
    return NearbyMeshModule.startMesh(nodeId);
  },
  stopMesh() {
    return NearbyMeshModule.stopMesh();
  },
  sendAlert(payload) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return NearbyMeshModule.sendAlert(body);
  },
  addListener(eventName, callback) {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener(eventName, callback);
  },
};

const NearbyMesh = NearbyMeshModule ? real : stub;
export default NearbyMesh;
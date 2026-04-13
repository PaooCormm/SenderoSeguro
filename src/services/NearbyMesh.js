import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `El módulo NearbyMesh no está disponible. ` +
  `Asegúrese de haber recompilado Android después de agregar el código nativo.`;

const { NearbyMeshModule } = NativeModules;

if (Platform.OS === 'android' && !NearbyMeshModule) {
  console.warn(LINKING_ERROR);
}

const emitter = NearbyMeshModule
  ? new NativeEventEmitter(NearbyMeshModule)
  : null;

const NearbyMesh = {
  startMesh(nodeId) {
    return NearbyMeshModule.startMesh(nodeId);
  },

  stopMesh() {
    return NearbyMeshModule.stopMesh();
  },

  sendAlert(payload) {
    return NearbyMeshModule.sendAlert(JSON.stringify(payload));
  },

  addListener(eventName, callback) {
    if (!emitter) {
      return { remove: () => {} };
    }
    return emitter.addListener(eventName, callback);
  },
};

export default NearbyMesh;
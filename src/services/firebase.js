/**
 * src/services/firebase.js
 * Inicialización de Firebase. Importa auth y db desde aquí.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'AIzaSyAOo3Eu3WI53r5DfunQDtOw_7d-u-9BbTU',
  authDomain:        'sendero-seguro-d181e.firebaseapp.com',
  projectId:         'sendero-seguro-d181e',
  storageBucket:     'sendero-seguro-d181e.firebasestorage.app',
  messagingSenderId: '447218372581',
  appId:             '1:447218372581:web:fccdfffdd8000acd71a90c',
  measurementId:     'G-HHXRZ9W5HG',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
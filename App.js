/**
 * App.js — Punto de entrada SSEGURO
 *
 * Cambios respecto a la versión anterior:
 *  - AppNavigator espera loading=false antes de navegar
 *    (evita flash de LoginScreen y pantalla en blanco)
 *  - Splash/loading spinner mientras AuthContext verifica sesión
 */
import React from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { MeshProvider } from './src/context/MeshContext';
import { LoginScreen }     from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';

// ─── Splash de carga ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={st.loading}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={st.logoWrap}>
        <Text style={st.logoText}>SS</Text>
      </View>
      <Text style={st.logoTitle}>Sendero Seguro</Text>
      <ActivityIndicator
        size="large"
        color="#C8102E"
        style={{ marginTop: 32 }}
      />
      <Text style={st.loadingText}>Verificando sesión...</Text>
    </View>
  );
}

// ─── Navegación raíz ──────────────────────────────────────────────────────────
function AppNavigator() {
  const { user, guestMode, loading } = useAuth();

  // Mientras AuthContext verifica token en AsyncStorage → mostrar splash
  if (loading) return <LoadingScreen />;

  // Sin sesión ni modo invitado → Login
  if (!user && !guestMode) return <LoginScreen />;

  // Con sesión o en modo invitado → Dashboard
  return <DashboardScreen />;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MeshProvider>
          <AppNavigator />
        </MeshProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// ─── Estilos del splash ───────────────────────────────────────────────────────
const st = StyleSheet.create({
  loading: {
    flex:            1,
    backgroundColor: '#FFFFFF',
    alignItems:      'center',
    justifyContent:  'center',
  },
  logoWrap: {
    width:           72,
    height:          72,
    borderRadius:    18,
    backgroundColor: '#C8102E',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    16,
    shadowColor:     '#C8102E',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       8,
  },
  logoText: {
    color:         '#FFF',
    fontSize:      28,
    fontWeight:    '700',
    letterSpacing: 1,
  },
  logoTitle: {
    fontSize:      22,
    fontWeight:    '700',
    color:         '#1A1A1A',
    letterSpacing: 0.5,
  },
  loadingText: {
    marginTop: 12,
    fontSize:  13,
    color:     '#888',
  },
});

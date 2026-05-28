import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOW } from '../constants/theme';
import { SectionHeader, Divider, LogLine, StatusBadge } from '../components/UIElements';
import api from '../services/api';
import { useMeshContext } from '../context/MeshContext';
import {AddContactModal} from '../components/AddContactModal';

import { useOrientation }    from '../hooks/useOrientation';

export function NetworkScreen({ guestMode }) {
  const mesh = useMeshContext();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  
    const layout = useOrientation();
    const isWide = layout.isLandscape || layout.isTablet;

    const [modalVisible, setModalVisible] = useState(false);

  const cargarContactos = useCallback(async () => {
    if (guestMode) { setLoading(false); return; }
    try {
      const res = await api.getContactos();
      setContacts(res.contacts || []);
    } catch (e) {
      Alert.alert("Error", "No se pudieron cargar tus contactos");
    } finally {
      setLoading(false);
    }
  }, [guestMode]);

  useEffect(() => { cargarContactos(); }, [cargarContactos]);

  const eliminarContacto = async (id) => {
    try {
      await api.eliminarContacto(id);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (e) { Alert.alert("Error", "No se pudo eliminar"); }
  };

  return (
    <ScrollView 
    style={styles.scrollBase}
    contentContainerStyle={styles.scrollContent, isWide && { padding: SPACING.xl}}
    showsVerticalScrollIndicator={false}
    >
        <Text style={styles.sectionHeading}>Estado de la Red</Text>
            <View style={styles.netCard}>
              <View style={styles.netRow}>
                <Text style={styles.netLabel}>Node ID</Text>
                <Text style={styles.netValue}>{mesh.nodeId}</Text>
              </View>
              <Divider />
              <View style={styles.netRow}>
                <Text style={styles.netLabel}>Estado</Text>
                <StatusBadge ready={mesh.ready} starting={mesh.starting} />
              </View>
              <Divider />
              <View style={styles.netRow}>
                <Text style={styles.netLabel}>Dispositivos</Text>
                <Text style={styles.netValue}>{mesh.connectedCount}</Text>
              </View>

              {!guestMode && (
                <>
                  <Divider />
                  <View style={styles.netActions}>
                    <TouchableOpacity
                      style={[styles.netBtn, styles.netBtnInfo]}
                      onPress={mesh.startMesh}
                      disabled={mesh.ready || mesh.starting}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.netBtnText}>Reiniciar red</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.netBtn, styles.netBtnDanger]}
                      onPress={mesh.stopMesh}
                      disabled={!mesh.ready}
                      activeOpacity={0.8}
                    >

                      <Text style={[styles.netBtnText, { color: COLORS.statusDanger }]}>
                        Detener red
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            <View style={styles.logsCard}>
              <SectionHeader title="Registros" />
              {mesh.logs.length === 0 ? (
                <Text style={styles.emptyText}>Sin registros todavia.</Text>
              ) : (
                mesh.logs.slice(0, 30).map((l, i) => <LogLine key={i} line={l} />)
              )}
            </View>

      {/* Contactos de Apoyo*/}
      <SectionHeader title="Contactos de Apoyo" />
            {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.md }} />
            ) : contacts.length > 0 ? (
            contacts.map(c => (
                <View key={c.id} style={styles.contactCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cName}>{c.nombre}</Text>
                    <Text style={styles.cPhone}>{c.telefono}</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => eliminarContacto(c.id)}
                    style={{ padding: SPACING.xs }}
                >
                    <MaterialIcons name="delete" color={COLORS.statusDanger} size={22}/>
                </TouchableOpacity>
                </View>
            ))
            ) : (
            <Text style={styles.emptyText}>No tienes contactos de apoyo registrados.</Text>
            )}

            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Agregar contacto de apoyo</Text>
            </TouchableOpacity>
      <AddContactModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)}
        onSave={(nuevo) => setContacts([...contacts, nuevo])}
      />
    </ScrollView>
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
        paddingBottom:   Platform.OS === 'ios' ? SPACING.md : SPACING.xs,
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
        netCard: {
        backgroundColor: COLORS.bgCard,
        borderRadius:    RADIUS.lg,
        padding:         SPACING.base,
        marginBottom:    SPACING.md,
        borderWidth:     1,
        borderColor:     COLORS.border,
        ...SHADOW.card,
    },
    netRow: {
        flexDirection:   'row',
        justifyContent:  'space-between',
        alignItems:      'center',
        paddingVertical: SPACING.xs,
    },
    netLabel: {
        color:    COLORS.textSecondary,
        fontSize: TYPOGRAPHY.sm,
    },
    netValue: {
        color:      COLORS.textPrimary,
        fontSize:   TYPOGRAPHY.sm,
        fontFamily: 'monospace',
        fontWeight: TYPOGRAPHY.fontMedium,
    },
    netActions: {
        flexDirection: 'row',
        gap:           SPACING.sm,
        marginTop:     SPACING.sm,
    },
    netBtn: {
        flex:            1,
        borderRadius:    RADIUS.md,
        paddingVertical: SPACING.md,
        alignItems:      'center',
        borderWidth:     1,
    },
    netBtnInfo: {
        backgroundColor: COLORS.statusInfoBg,
        borderColor:     COLORS.statusInfo,
    },
    netBtnDanger: {
        backgroundColor: COLORS.statusDangerBg,
        borderColor:     COLORS.statusDanger,
    },
    netBtnText: {
        fontSize:   TYPOGRAPHY.sm,
        fontWeight: TYPOGRAPHY.fontSemibold,
        color:      COLORS.statusInfo,
    },
    logsCard: {
        backgroundColor: COLORS.bgCard,
        borderRadius:    RADIUS.lg,
        padding:         SPACING.base,
        borderWidth:     1,
        borderColor:     COLORS.border,
        ...SHADOW.card,
    },

    // Contactos
    contactCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        padding: SPACING.base,
        marginBottom: SPACING.sm,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOW.card, // Esto le da la misma elevación que tus otras cards
    },
    
    // 2. Texto del contacto
    cName: {
        fontSize: TYPOGRAPHY.sm,
        fontWeight: TYPOGRAPHY.fontSemibold,
        color: COLORS.textPrimary,
    },
    cPhone: {
        fontSize: TYPOGRAPHY.xs,
        color: COLORS.textMuted,
        marginTop: 2,
        fontFamily: 'monospace',
    },

    // 3. Botón de agregar
    addBtn: {
        backgroundColor: COLORS.bgSurface,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderStyle: 'dashed', // Estilo de botón para agregar
        borderColor: COLORS.primary,
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
    addBtnText: {
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontSemibold,
        fontSize: TYPOGRAPHY.sm,
    },
 });

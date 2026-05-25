import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';
import api from '../services/api';

export function AddContactModal({ visible, onClose, onSave }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', relacion: '' });
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async () => {
    if (!form.nombre || !form.telefono) return;
    setEnviando(true);
    try {
      const res = await api.agregarContacto(form);
      onSave(res.contact);
      onClose();
      setForm({ nombre: '', telefono: '', email: '', relacion: '' });
    } catch (e) {
      alert("Error al guardar contacto");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Nuevo Contacto</Text>
          <TextInput style={styles.input} placeholder="Nombre" value={form.nombre} onChangeText={t => setForm({...form, nombre: t})} />
          <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={form.telefono} onChangeText={t => setForm({...form, telefono: t})} />
          <TextInput style={styles.input} placeholder="Email (opcional)" keyboardType="email-address" value={form.email} onChangeText={t => setForm({...form, email: t})} />
          <TextInput style={styles.input} placeholder="Relación (ej. Mamá)" value={form.relacion} onChangeText={t => setForm({...form, relacion: t})} />
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={enviando}>
              {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: COLORS.bgCard, padding: 20, borderRadius: RADIUS.lg },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: COLORS.primary, padding: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' }
});
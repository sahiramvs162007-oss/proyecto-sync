import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import HistorialRepository from '../repositories/HistorialRepository';
import { colors, radius, spacing, shadow, typography } from '../theme/theme';
import Badge from '../components/Badge';

export default function HistorialScreen() {
  const [historial, setHistorial] = useState([]);

  const cargar = useCallback(() => {
    HistorialRepository.obtenerHistorial().then(setHistorial);
  }, []);

  useFocusEffect(cargar);

  const renderItem = ({ item }) => {
    const textRes = (item.resultado || '').toLowerCase();
    const isError = textRes.includes('error');
    const isPending = textRes.includes('pendiente');
    const tone = isError ? 'critical' : isPending ? 'pending' : 'success';
    
    return (
      <View style={styles.item}>
        <View style={styles.header}>
          <Text style={styles.fecha}>{new Date(item.fecha).toLocaleString()}</Text>
          <Badge label={item.resultado} tone={tone} />
        </View>
        <Text style={styles.persona}>{item.persona} <Text style={styles.doc}>({item.documento})</Text></Text>
        <Text style={styles.evento}>{item.evento}</Text>
        <Text style={styles.desc}>{item.descripcion}</Text>
      </View>
    );
  };

  return (
    <ResponsiveContainer style={styles.container}>
      <View style={styles.top}>
        <Text style={typography.title}>Historial de Eventos</Text>
        <Text style={typography.subtitle}>Bitácora de sincronización y registros</Text>
      </View>
      
      <FlatList
        data={historial}
        keyExtractor={item => item.uuid || item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={typography.bodyMuted}>Aún no hay eventos registrados</Text>
          </View>
        }
      />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, width: '100%' },
  top: { marginBottom: spacing.lg },
  item: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs, alignItems: 'center' },
  fecha: { fontSize: 12, color: colors.textSecondary },
  persona: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  doc: { fontWeight: '400', color: colors.textSecondary },
  evento: { fontSize: 13, color: colors.accent, marginTop: spacing.xs, fontWeight: '500' },
  desc: { fontSize: 14, color: colors.textPrimary, marginTop: 2 },
  vacio: { alignItems: 'center', marginTop: 40 }
});

import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import PersonaService from '../services/PersonaService';
import SyncService from '../services/SyncService';
import { useNetwork } from '../context/NetworkContext';
import { useResponsive } from '../utils/responsive';
import ResponsiveContainer from '../components/ResponsiveContainer';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { colors, radius, spacing, shadow, typography } from '../theme/theme';

export default function ListadoPersonasScreen({ navigation }) {
  const [personas, setPersonas] = useState([]);
  const { online, sincronizando } = useNetwork();
  const { columns, isDesktop } = useResponsive();

  const cargar = useCallback(() => {
    PersonaService.listar().then(setPersonas);
  }, []);

  useFocusEffect(cargar);

  async function sincronizarManual() {
    await SyncService.sincronizar();
    cargar();
  }

  return (
    <ResponsiveContainer style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={typography.title}>Personas</Text>
          <Text style={typography.subtitle}>{personas.length} registradas</Text>
        </View>
        <Badge
          label={sincronizando ? 'Sincronizando…' : online ? 'En línea' : 'Sin conexión'}
          tone={sincronizando ? 'pending' : online ? 'success' : 'neutral'}
        />
      </View>

      <FlatList
        data={personas}
        keyExtractor={(item) => item.uuid}
        numColumns={columns}
        key={columns}
        columnWrapperStyle={columns > 1 ? { gap: spacing.md } : undefined}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <Pressable
            style={({ hovered }) => [
              styles.item,
              columns > 1 && { flex: 1 },
              hovered && styles.itemHovered
            ]}
            onPress={() => navigation.navigate('EditarPersona', { uuid: item.uuid })}
          >
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.doc}>{item.documento}</Text>
            <Badge
              label={item.sync_status === 'SYNCED' ? 'Sincronizado' : 'Pendiente'}
              tone={item.sync_status === 'SYNCED' ? 'success' : 'pending'}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={typography.body}>Aún no hay personas registradas</Text>
            <Text style={typography.bodyMuted}>Toca "Registrar persona" para empezar</Text>
          </View>
        }
      />

      <View style={[styles.acciones, isDesktop && styles.accionesRow]}>
        <Button
          title="Sincronizar ahora"
          variant="outline"
          onPress={sincronizarManual}
          disabled={!online}
          style={isDesktop && { flex: 0 }}
        />
        <Button
          title="Registrar persona"
          onPress={() => navigation.navigate('RegistrarPersona')}
          style={isDesktop && { flex: 0 }}
        />
      </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, width: '100%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl
  },
  item: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    ...shadow.card
  },
  itemHovered: { borderColor: colors.textPrimary },
  nombre: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  doc: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.xs },
  vacio: { alignItems: 'center', marginTop: 60, gap: spacing.xs },
  acciones: { gap: spacing.sm, marginTop: spacing.lg },
  accionesRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start' }
});

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import PersonaService from '../services/PersonaService';
import ResponsiveContainer from '../components/ResponsiveContainer';
import TextField from '../components/TextField';
import Button from '../components/Button';
import { colors, spacing, typography } from '../theme/theme';

export default function EditarPersonaScreen({ route, navigation }) {
  const { uuid } = route.params;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [documento, setDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    PersonaService.obtener(uuid).then((persona) => {
      if (persona) {
        setDocumento(persona.documento || '');
        setNombre(persona.nombre || '');
        setTelefono(persona.telefono || '');
        setEmail(persona.email || '');
      }
      setCargando(false);
    });
  }, [uuid]);

  async function handleGuardar() {
    setError('');
    setGuardando(true);
    try {
      await PersonaService.editar(uuid, { documento, nombre, telefono, email });
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar() {
    await PersonaService.eliminar(uuid);
    navigation.goBack();
  }

  if (cargando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <ResponsiveContainer style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={({ hovered }) => [styles.volver, hovered && { opacity: 0.6 }]}>
        <Text style={styles.volverText}>← Volver</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={typography.title}>Editar persona</Text>
        <Text style={[typography.subtitle, { marginTop: spacing.xs }]}>{nombre}</Text>
      </View>

      <TextField label="Documento" value={documento} onChangeText={setDocumento} />
      <TextField label="Nombre completo" value={nombre} onChangeText={setNombre} />
      <TextField label="Teléfono" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
      <TextField label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.acciones}>
        <Button title="Guardar cambios" onPress={handleGuardar} loading={guardando} style={{ flex: 1 }} />
      </View>

      <Button title="Eliminar persona" variant="ghost" onPress={handleEliminar} style={styles.eliminar} />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, width: '100%' },
  volver: { marginBottom: spacing.lg, alignSelf: 'flex-start' },
  volverText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  hero: { marginBottom: spacing.xxl },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
  acciones: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  eliminar: { marginTop: spacing.lg, alignSelf: 'center' }
});

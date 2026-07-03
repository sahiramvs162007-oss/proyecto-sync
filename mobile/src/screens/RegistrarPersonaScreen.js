import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PersonaService from '../services/PersonaService';
import ResponsiveContainer from '../components/ResponsiveContainer';
import TextField from '../components/TextField';
import Button from '../components/Button';
import { colors, spacing, typography } from '../theme/theme';

export default function RegistrarPersonaScreen({ navigation }) {
  const [documento, setDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGuardar() {
    setError('');
    setLoading(true);
    try {
      // Se guarda en el almacenamiento local (SQLite o IndexedDB) y se encola
      // para sync de inmediato, sin importar si hay internet o no.
      await PersonaService.registrar({ documento, nombre, telefono, email });
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveContainer style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={({ hovered }) => [styles.volver, hovered && { opacity: 0.6 }]}>
        <Text style={styles.volverText}>← Volver</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={typography.title}>Registrar persona</Text>
        <Text style={[typography.subtitle, { marginTop: spacing.xs }]}>
          Se guarda localmente y se sincroniza cuando haya conexión
        </Text>
      </View>

      <TextField label="Documento" placeholder="Número de documento" value={documento} onChangeText={setDocumento} />
      <TextField label="Nombre completo" placeholder="Nombre y apellido" value={nombre} onChangeText={setNombre} />
      <TextField
        label="Teléfono"
        placeholder="Opcional"
        keyboardType="phone-pad"
        value={telefono}
        onChangeText={setTelefono}
      />
      <TextField
        label="Email"
        placeholder="Opcional"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Guardar" onPress={handleGuardar} loading={loading} style={styles.guardar} />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, width: '100%' },
  volver: { marginBottom: spacing.lg, alignSelf: 'flex-start' },
  volverText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  hero: { marginBottom: spacing.xxl },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
  guardar: { marginTop: spacing.sm }
});

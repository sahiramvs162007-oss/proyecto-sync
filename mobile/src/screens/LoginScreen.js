import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AuthService from '../services/AuthService';
import { useNetwork } from '../context/NetworkContext';
import ResponsiveContainer from '../components/ResponsiveContainer';
import TextField from '../components/TextField';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { colors, spacing, typography } from '../theme/theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { online } = useNetwork();

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await AuthService.login(email, password);
      navigation.replace('Personas');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveContainer style={styles.container}>
      <View style={styles.header}>
        <Badge label={online ? 'En línea' : 'Sin conexión'} tone={online ? 'success' : 'neutral'} />
      </View>

      <View style={styles.hero}>
        <Text style={typography.title}>Bienvenido</Text>
        <Text style={[typography.subtitle, { marginTop: spacing.xs }]}>
          Ingresa tus credenciales para continuar
        </Text>
      </View>

      <TextField
        label="Email"
        placeholder="tu@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Contraseña"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Ingresar" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.sm }} />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', padding: spacing.xl },
  header: { alignItems: 'flex-end', marginBottom: spacing.xl },
  hero: { marginBottom: spacing.xxl },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.md }
});

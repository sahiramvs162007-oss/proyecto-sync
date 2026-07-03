import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../utils/responsive';
import { colors } from '../theme/theme';

/**
 * En celular ocupa el 100% del ancho. En tablet/web limita el ancho
 * y lo centra, para que los formularios y listados no se estiren
 * de borde a borde en pantallas grandes (patrón estándar de apps
 * "universales" React Native + web).
 */
export default function ResponsiveContainer({ children, style }) {
  const { contentMaxWidth } = useResponsive();

  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { maxWidth: contentMaxWidth, width: '100%' }, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', width: '100%', backgroundColor: colors.background },
  inner: { flex: 1 }
});

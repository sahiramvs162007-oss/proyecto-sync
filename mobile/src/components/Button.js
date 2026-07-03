import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

/**
 * variant: 'primary' (relleno oscuro) | 'outline' (borde) | 'ghost' (texto solo, sutil)
 */
export default function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed, hovered }) => [
        styles.base,
        variantStyles[variant].base,
        (disabled || loading) && styles.disabled,
        pressed && variantStyles[variant].pressed,
        hovered && !pressed && variantStyles[variant].hovered,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? colors.textOnAccent : colors.textPrimary} />
      ) : (
        <Text style={[styles.text, variantStyles[variant].text]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  disabled: { opacity: 0.45 }
});

const variantStyles = {
  primary: StyleSheet.create({
    base: { backgroundColor: colors.textPrimary },
    text: { color: colors.textOnAccent },
    pressed: { backgroundColor: '#000000' },
    hovered: { backgroundColor: '#303032' }
  }),
  outline: StyleSheet.create({
    base: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    text: { color: colors.textPrimary },
    pressed: { backgroundColor: colors.background },
    hovered: { borderColor: colors.textPrimary }
  }),
  ghost: StyleSheet.create({
    base: { backgroundColor: 'transparent', paddingHorizontal: spacing.sm },
    text: { color: colors.danger },
    pressed: { opacity: 0.6 },
    hovered: { opacity: 0.8 }
  })
};

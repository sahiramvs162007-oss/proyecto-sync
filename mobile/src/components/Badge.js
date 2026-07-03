import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

const TONES = {
  success: { bg: colors.successBg, dot: colors.success, text: colors.success },
  pending: { bg: colors.pendingBg, dot: colors.pending, text: colors.pending },
  danger: { bg: colors.dangerBg, dot: colors.danger, text: colors.danger },
  neutral: { bg: colors.background, dot: colors.textSecondary, text: colors.textSecondary }
};

export default function Badge({ label, tone = 'neutral' }) {
  const t = TONES[tone];
  return (
    <View style={[styles.wrapper, { backgroundColor: t.bg }]}>
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <Text style={[styles.text, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    gap: spacing.xs
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 }
});

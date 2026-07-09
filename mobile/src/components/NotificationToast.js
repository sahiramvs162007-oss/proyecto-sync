import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { colors, radius, spacing, shadow } from '../theme/theme';

export default function NotificationToast({ visible, message, type }) {
  const translateY = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: Platform.OS === 'web' ? 20 : 10,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const bgColors = {
    success: colors.successBg,
    error: colors.dangerBg,
    info: colors.pendingBg,
  };
  const textColors = {
    success: colors.success,
    error: colors.danger,
    info: colors.pending,
  };

  return (
    <SafeAreaView style={styles.safeArea} pointerEvents="none">
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: bgColors[type] || colors.surface,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={[styles.text, { color: textColors[type] || colors.textPrimary }]}>
          {message}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginHorizontal: spacing.xl,
    marginTop: Platform.OS !== 'web' ? spacing.xl : 0,
    ...shadow.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 250,
    maxWidth: 400,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

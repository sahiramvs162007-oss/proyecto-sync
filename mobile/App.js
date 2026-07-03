import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import { initDatabase } from './src/database/db';
import { NetworkProvider } from './src/context/NetworkContext';
import RootNavigator from './src/navigation/RootNavigator';
import { colors, typography } from './src/theme/theme';

export default function App() {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setListo(true))
      .catch((err) => console.error('Error inicializando BD local:', err));
  }, []);

  if (!listo) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
        <Text style={[typography.bodyMuted, { marginTop: 12 }]}>Preparando base de datos local…</Text>
      </View>
    );
  }

  return (
    <NetworkProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </NetworkProvider>
  );
}

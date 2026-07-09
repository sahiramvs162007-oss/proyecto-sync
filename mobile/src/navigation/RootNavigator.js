import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import ListadoPersonasScreen from '../screens/ListadoPersonasScreen';
import RegistrarPersonaScreen from '../screens/RegistrarPersonaScreen';
import EditarPersonaScreen from '../screens/EditarPersonaScreen';
import HistorialScreen from '../screens/HistorialScreen';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false, // cada pantalla ya trae su propio título dentro del ResponsiveContainer
  contentStyle: { backgroundColor: colors.background }
};

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Personas" component={ListadoPersonasScreen} />
      <Stack.Screen name="RegistrarPersona" component={RegistrarPersonaScreen} />
      <Stack.Screen name="EditarPersona" component={EditarPersonaScreen} />
      <Stack.Screen name="Historial" component={HistorialScreen} />
    </Stack.Navigator>
  );
}

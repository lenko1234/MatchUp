import { Stack } from 'expo-router';
import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerTitleAlign: 'center' }}>
        <Stack.Screen name="index" options={{ title: 'Inicio' }} />
        <Stack.Screen name="partidos" options={{ headerShown: false }} />
        <Stack.Screen name="crear/index" options={{ title: 'Crear partido' }} />
        <Stack.Screen name="login" options={{ title: 'Seleccionar Tipo' }} />
        <Stack.Screen name="loginJugador" options={{ title: 'Login Jugador' }} />
        <Stack.Screen name="loginCanchero" options={{ title: 'Login Canchero' }} />
        <Stack.Screen name="jugador" options={{ title: 'Jugador' }} />
        <Stack.Screen name="canchero" options={{ title: 'Canchero' }} />
        <Stack.Screen name="infoCanchero" options={{ title: 'Información del Canchero' }} />
      </Stack>
    </ThemeProvider>
  );
}

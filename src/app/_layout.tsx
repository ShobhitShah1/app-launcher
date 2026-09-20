import React, { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, StyleSheet } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { MatteBlackTheme } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const MatteBlackNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: MatteBlackTheme.accent,
    background: MatteBlackTheme.background,
    card: '#0D0D11',
    text: MatteBlackTheme.text,
    border: MatteBlackTheme.border,
    notification: MatteBlackTheme.accent,
  },
};

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={MatteBlackNavTheme}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <AppTabs />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

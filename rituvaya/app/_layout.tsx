import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { getCalendars, getLocales } from 'expo-localization';
import { isLanguage, useI18n } from '@/i18n';
import { AppStore } from '@/state/store';
import { StoreProvider, useSnapshot } from '@/state/context';
import { createRepository } from '@/storage';
import { ThemeProvider, useTheme } from '@/ui/ThemeProvider';
import { ToastProvider } from '@/ui/components/Toast';
import { NotificationBridge } from '@/features/NotificationBridge';
import { applyLayoutDirection } from '@/ui/rtl';
import type { Language } from '@/domain/types';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function deviceLanguage(): Language | null {
  try {
    const code = getLocales()[0]?.languageCode ?? null;
    return isLanguage(code) ? code : null;
  } catch {
    return null;
  }
}

function deviceUses24h(): boolean {
  try {
    return getCalendars()[0]?.uses24hourClock ?? true;
  } catch {
    return true;
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
  });
  const store = useMemo(() => new AppStore({ repo: createRepository(), deviceUses24h }), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    store
      .init(deviceLanguage())
      .catch((error) => {
        if (__DEV__) console.error('Store init failed', error);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const fontsReady = fontsLoaded || Boolean(fontError);
  useEffect(() => {
    if (ready && fontsReady) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready, fontsReady]);

  if (!ready || !fontsReady) return <View style={{ flex: 1, backgroundColor: '#F7F5EF' }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider store={store}>
          <ThemedApp />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const snapshot = useSnapshot();
  return (
    <ThemeProvider preference={snapshot.settings.theme}>
      <Shell />
    </ThemeProvider>
  );
}

function Shell() {
  const theme = useTheme();
  const { rtl } = useI18n();
  useEffect(() => {
    if (Platform.OS === 'web') void applyLayoutDirection(rtl);
  }, [rtl]);
  return (
    <ToastProvider bottomOffset={0}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <NotificationBridge />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="hydration" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="item/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="due" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </ToastProvider>
  );
}

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemePreference } from '@/domain/types';
import { makeTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme>(makeTheme('light'));

export function ThemeProvider({ preference, children }: { preference: ThemePreference; children: React.ReactNode }) {
  const system = useColorScheme();
  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const theme = useMemo(() => makeTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

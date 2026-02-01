import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import i18n from '@/i18n/config';

const THEME_KEY = 'driver_mobile_theme';
const LANGUAGE_KEY = 'i18nextLng'; // i18n uses this

type ThemeMode = 'light' | 'dark';
type LanguageCode = 'en' | 'es';

interface DriverMobileContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
}

const DriverMobileContext = createContext<DriverMobileContextType | undefined>(undefined);

export function useDriverMobile() {
  const ctx = useContext(DriverMobileContext);
  if (!ctx) throw new Error('useDriverMobile must be used within DriverMobileProvider');
  return ctx;
}

export function DriverMobileProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const lng = i18n.language || localStorage.getItem(LANGUAGE_KEY) || 'en';
    return lng.startsWith('es') ? 'es' : 'en';
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const handler = () => setLanguageState(i18n.language?.startsWith('es') ? 'es' : 'en');
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light')), []);

  const setLanguage = useCallback((l: LanguageCode) => {
    setLanguageState(l);
    i18n.changeLanguage(l);
    localStorage.setItem(LANGUAGE_KEY, l);
  }, []);

  const value: DriverMobileContextType = {
    theme,
    setTheme,
    toggleTheme,
    language,
    setLanguage,
  };

  return (
    <DriverMobileContext.Provider value={value}>
      {children}
    </DriverMobileContext.Provider>
  );
}

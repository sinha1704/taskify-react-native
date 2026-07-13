import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { theme, AppTheme, ThemeColors } from './theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextProps {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  colors: ThemeColors;
  spacing: typeof theme.light.spacing;
  typography: typeof theme.light.typography;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    (systemScheme === 'dark' ? 'dark' : 'light') as ThemeMode
  );

  // Sync with device system settings when they change
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) => {
      if (colorScheme) {
        setThemeMode(colorScheme as ThemeMode);
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const toggleTheme = () => {
    setThemeMode((prevMode: ThemeMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const currentTheme = themeMode === 'dark' ? theme.dark : theme.light;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        toggleTheme,
        colors: currentTheme.colors,
        spacing: currentTheme.spacing,
        typography: currentTheme.typography,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be wrapped inside a ThemeProvider component.');
  }
  return context;
};

export default ThemeProvider;

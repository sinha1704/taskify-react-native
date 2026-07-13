import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { store } from './store/store';
import { ThemeProvider, useTheme } from './shared/theme/ThemeContext';
import { RootNavigator } from './navigation/RootNavigator';
import { syncEngine } from './database/syncEngine';
import { notificationService } from './features/notifications/notificationService';
import { taskLocalRepo } from './database/taskLocalRepo';

// Deep Linking Configuration mapping URL triggers to specific screens
const linking = {
  prefixes: ['taskify://'],
  config: {
    screens: {
      Home: 'home',
      TaskDetail: 'task/:taskId',
      Settings: 'settings',
    },
  },
};

/**
 * Inner component to hook status bar colors and initial service lifecycle triggers
 * since hooks are only valid inside Context Providers.
 */
const MainApp: React.FC = () => {
  const { colors, themeMode } = useTheme();

  useEffect(() => {
    // 1. Initialize Network Sync Engine listeners
    syncEngine.startSyncListener();

    // 2. Initialize Push and Local Notification triggers
    notificationService.initialize();

    // 3. Perform startup synchronization sweep if online
    syncEngine.triggerSync();

    return () => {
      // 4. Safely clean up listeners and close database connections on app unmount
      syncEngine.stopSyncListener();
      taskLocalRepo.closeRealm();
    };
  }, []);

  return (
    <>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </Provider>
  );
}

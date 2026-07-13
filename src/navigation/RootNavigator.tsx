import React, { useEffect, Suspense } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setAuthUser, setAuthLoading } from '../features/auth/redux/authSlice';
import authService from '../features/auth/services/authService';
import { useTheme } from '../shared/theme/ThemeContext';
import { AuthStackParamList, AppStackParamList } from './types';

// Screens - Auth Stack (Loaded Eagerly)
import LoginScreen from '../features/auth/screens/LoginScreen';
import SignUpScreen from '../features/auth/screens/SignUpScreen';

// Screens - App Stack (Code Split/Lazy Loaded)
const HomeScreen = React.lazy(() => import('../features/tasks/screens/HomeScreen'));
const TaskDetailScreen = React.lazy(() => import('../features/tasks/screens/TaskDetailScreen'));
const SettingsScreen = React.lazy(() => import('../features/settings/screens/SettingsScreen'));

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

/**
 * Lazy loading screen wrapper with a loading indicator.
 */
function SuspendedScreen<T extends object>(Component: React.ComponentType<T>) {
  return (props: T) => {
    const { colors } = useTheme();
    return (
      <Suspense
        fallback={
          <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        }
      >
        <Component {...props} />
      </Suspense>
    );
  };
}

const SuspendedHome = SuspendedScreen(HomeScreen);
const SuspendedTaskDetail = SuspendedScreen(TaskDetailScreen);
const SuspendedSettings = SuspendedScreen(SettingsScreen);

export function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const { colors } = useTheme();

  // Listen to Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      dispatch(setAuthUser(user));
      dispatch(setAuthLoading(false));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return isAuthenticated ? (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AppStack.Screen
        name="Home"
        component={SuspendedHome}
        options={{ title: 'My Tasks' }}
      />
      <AppStack.Screen
        name="TaskDetail"
        component={SuspendedTaskDetail}
        options={{ title: 'Task Details' }}
      />
      <AppStack.Screen
        name="Settings"
        component={SuspendedSettings}
        options={{ title: 'Settings' }}
      />
    </AppStack.Navigator>
  ) : (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RootNavigator;

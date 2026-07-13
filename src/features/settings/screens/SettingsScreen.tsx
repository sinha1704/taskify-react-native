import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { clearAuth } from '../../auth/redux/authSlice';
import { authService } from '../../auth/services/authService';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { syncEngine } from '../../../database/syncEngine';
import { taskLocalRepo } from '../../../database/taskLocalRepo';

export const SettingsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { colors, spacing, typography, themeMode, toggleTheme } = useTheme();

  const [dbStats, setDbStats] = useState({ total: 0, pending: 0 });

  // Load database status stats
  const fetchDbStats = async () => {
    try {
      const allTasks = await taskLocalRepo.getAllTasks();
      const queue = await taskLocalRepo.getPendingSyncQueue();
      setDbStats({
        total: allTasks.length,
        pending: queue.length,
      });
    } catch (error) {
      console.error('[SettingsScreen] Failed to retrieve DB stats:', error);
    }
  };

  useEffect(() => {
    fetchDbStats();
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of your session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              dispatch(clearAuth());
              // RootNavigator automatically transitions to AuthStack
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Logout failed.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Profile Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md }]}>
          <Text style={[typography.subtitle, { color: colors.primary, marginBottom: spacing.xs, fontWeight: '700' }]}>
            User Profile
          </Text>
          <Text style={[typography.body, { color: colors.text }]}>
            Email: {user?.email || 'N/A'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
            User ID: {user?.uid || 'N/A'}
          </Text>
        </View>

        {/* Sync & Connectivity Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md }]}>
          <Text style={[typography.subtitle, { color: colors.primary, marginBottom: spacing.xs, fontWeight: '700' }]}>
            Network & Sync
          </Text>
          <Text style={[typography.body, { color: colors.text }]}>
            Connectivity: {syncEngine.isOnline() ? '🟢 Online' : '🔴 Offline'}
          </Text>
          <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>
            Total Local Tasks: {dbStats.total}
          </Text>
          <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>
            Pending Sync Actions: {dbStats.pending}
          </Text>

          {dbStats.pending > 0 && syncEngine.isOnline() && (
            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: colors.primary, marginTop: spacing.md }]}
              onPress={async () => {
                await syncEngine.triggerSync();
                fetchDbStats();
              }}
            >
              <Text style={[typography.button, { color: colors.onPrimary }]}>Force Sync Now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md }]}>
          <Text style={[typography.subtitle, { color: colors.primary, marginBottom: spacing.sm, fontWeight: '700' }]}>
            App Preferences
          </Text>
          <View style={styles.preferenceRow}>
            <Text style={[typography.body, { color: colors.text }]}>
              Theme: {themeMode === 'light' ? 'Light Mode ☀️' : 'Dark Mode 🌙'}
            </Text>
            <TouchableOpacity
              style={[styles.toggleBtn, { borderColor: colors.border, borderWidth: 1 }]}
              onPress={toggleTheme}
            >
              <Text style={[typography.caption, { color: colors.text }]}>Toggle Theme</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Card */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.error, padding: spacing.md }]}
          onPress={handleSignOut}
        >
          <Text style={[typography.button, { color: '#FFFFFF', fontWeight: '700' }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  sectionCard: {
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  syncButton: {
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
});

export default SettingsScreen;

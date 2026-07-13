import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchTasksThunk,
  createTaskThunk,
  updateTaskThunk,
  deleteTaskThunk,
} from '../../../store/taskThunks';
import { TaskList } from '../components/TaskList';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { syncEngine } from '../../../database/syncEngine';
import { AppNavigationProp } from '../../../navigation/types';

export const HomeScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<AppNavigationProp>();
  const { colors, spacing, typography, themeMode, toggleTheme } = useTheme();

  const { items: tasks, isLoading, error } = useSelector((state: RootState) => state.tasks);

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // 1. Fetch local tasks immediately, which then initiates Firestore merges if online
    dispatch(fetchTasksThunk() as any);

    // 2. Setup sync listener to watch for background sync actions
    const removeListener = syncEngine.addStateListener((syncing) => {
      setIsSyncing(syncing);
      if (!syncing) {
        // Refresh local view when background sync completes
        dispatch(fetchTasksThunk() as any);
      }
    });

    return () => {
      removeListener();
    };
  }, [dispatch]);

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await (dispatch(
        createTaskThunk({
          title: newTitle.trim(),
          description: newDescription.trim(),
          isCompleted: false,
        }) as any
      ) as any).unwrap();

      setNewTitle('');
      setNewDescription('');
      setModalVisible(false);
    } catch (err) {
      console.error('[HomeScreen] Error creating task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = (id: string, isCompleted: boolean) => {
    dispatch(updateTaskThunk({ id, updates: { isCompleted } }) as any);
  };

  const handleDeleteTask = (id: string) => {
    dispatch(deleteTaskThunk(id) as any);
  };

  const handleRefresh = () => {
    dispatch(fetchTasksThunk() as any);
    syncEngine.triggerSync();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header Options */}
      <View style={[styles.headerActions, { padding: spacing.md, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Connection: {syncEngine.isOnline() ? '🟢 Online' : '🔴 Offline'}
          </Text>
          {isSyncing && (
            <Text style={[typography.caption, { color: colors.primary, fontWeight: 'bold' }]}>
              ⏳ Syncing data...
            </Text>
          )}
        </View>

        <View style={styles.headerButtonRow}>
          {/* Theme Mode Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.background }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>{themeMode === 'light' ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>

          {/* Settings Navigation */}
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.background }]}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Task List */}
      <View style={styles.listContainer}>
        {isLoading && tasks.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <TaskList
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteTask}
            onRefresh={handleRefresh}
            refreshing={isLoading}
          />
        )}
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: colors.primary, bottom: spacing.xl, right: spacing.lg }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.floatingButtonText, { color: colors.onPrimary }]}>+</Text>
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardContainer}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface, padding: spacing.lg }]}>
              <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
                Add New Task
              </Text>

              {/* Title input */}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    padding: spacing.md,
                    marginBottom: spacing.md,
                  },
                ]}
                placeholder="Task Title"
                placeholderTextColor={colors.textSecondary}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Description input */}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    padding: spacing.md,
                    marginBottom: spacing.lg,
                    height: 100,
                  },
                ]}
                placeholder="Task Description"
                placeholderTextColor={colors.textSecondary}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => setModalVisible(false)}
                  disabled={isSubmitting}
                >
                  <Text style={[typography.button, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleCreateTask}
                  disabled={isSubmitting || !newTitle.trim()}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : (
                    <Text style={[typography.button, { color: colors.onPrimary }]}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  listContainer: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  floatingButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardContainer: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;

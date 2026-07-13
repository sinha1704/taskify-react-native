import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../../store/store';
import { updateTaskThunk, deleteTaskThunk } from '../../../store/taskThunks';
import { useTheme } from '../../../shared/theme/ThemeContext';
import { AppStackParamList } from '../../../navigation/types';

type TaskDetailScreenRouteProp = RouteProp<AppStackParamList, 'TaskDetail'>;

export const TaskDetailScreen: React.FC = () => {
  const route = useRoute<TaskDetailScreenRouteProp>();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, spacing, typography } = useTheme();

  const { taskId } = route.params;

  // Retrieve the task from Redux state
  const task = useSelector((state: RootState) =>
    state.tasks.items.find((item) => item.id === taskId)
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form fields when task object is fetched
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setIsCompleted(task.isCompleted);
    }
  }, [task]);

  if (!task) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[typography.body, { color: colors.text }]}>Task not found.</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary, marginTop: spacing.md, padding: spacing.md }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[typography.button, { color: colors.onPrimary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      await dispatch(
        updateTaskThunk({
          id: taskId,
          updates: {
            title: title.trim(),
            description: description.trim(),
            isCompleted,
          },
        })
      ).unwrap();

      Alert.alert('Success', 'Task updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('[TaskDetailScreen] Error updating task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to permanently delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteTaskThunk(taskId)).unwrap();
              navigation.goBack();
            } catch (error) {
              console.error('[TaskDetailScreen] Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexContainer}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Edit Block */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
              Task Title
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  padding: spacing.md,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter task title"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Description Edit Block */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  padding: spacing.md,
                  height: 120,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter task description"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
            />
          </View>

          {/* Completion Toggle Block */}
          <TouchableOpacity
            style={[
              styles.checkboxContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                padding: spacing.md,
                marginBottom: spacing.xl,
              },
            ]}
            onPress={() => setIsCompleted(!isCompleted)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: isCompleted ? colors.success : colors.border,
                  backgroundColor: isCompleted ? colors.success : 'transparent',
                  marginRight: spacing.md,
                },
              ]}
            >
              {isCompleted && <Text style={[styles.checkText, { color: colors.background }]}>✓</Text>}
            </View>
            <Text style={[typography.body, { color: colors.text }]}>
              Mark task as completed
            </Text>
          </TouchableOpacity>

          {/* Action Row */}
          <View style={styles.actionRow}>
            {/* Delete button */}
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.error, borderWidth: 1 }]}
              onPress={handleDelete}
              disabled={isSaving}
            >
              <Text style={[typography.button, { color: colors.error }]}>Delete Task</Text>
            </TouchableOpacity>

            {/* Save updates button */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdate}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={[typography.button, { color: colors.onPrimary }]}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flexContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 0.48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TaskDetailScreen;

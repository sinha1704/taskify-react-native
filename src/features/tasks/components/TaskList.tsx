import React, { useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../../navigation/types';
import { TaskFields } from '../../../database/schemas';
import { useTheme } from '../../../shared/theme/ThemeContext';

interface TaskListProps {
  tasks: TaskFields[];
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const ITEM_HEIGHT = 88; // Fixed height for list item layout optimizations

// Memoized Task List Item to prevent unnecessary re-renders
const TaskItem = React.memo<{
  item: TaskFields;
  colors: any;
  spacing: any;
  typography: any;
  onPress: (id: string) => void;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onDelete: (id: string) => void;
}>(({ item, colors, spacing, typography, onPress, onToggleComplete, onDelete }) => {
  const handlePress = () => onPress(item.id);
  const handleToggle = () => onToggleComplete(item.id, !item.isCompleted);
  const handleDelete = () => onDelete(item.id);

  // Sync Badge indicator styling
  const getSyncBadgeStyles = () => {
    switch (item.syncStatus) {
      case 'synced':
        return { text: '✓ Synced', color: colors.success };
      case 'pending_create':
        return { text: '⚡ Pending Save', color: colors.primary };
      case 'pending_update':
        return { text: '✎ Pending Update', color: '#FF9800' };
      default:
        return { text: '...', color: colors.textSecondary };
    }
  };

  const badge = getSyncBadgeStyles();

  return (
    <View style={[styles.itemContainer, { height: ITEM_HEIGHT, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Complete Checkbox Circle */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            borderColor: item.isCompleted ? colors.success : colors.border,
            backgroundColor: item.isCompleted ? colors.success : 'transparent',
            marginRight: spacing.md,
          },
        ]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        {item.isCompleted && <Text style={[styles.checkText, { color: colors.background }]}>✓</Text>}
      </TouchableOpacity>

      {/* Task Information */}
      <TouchableOpacity
        style={styles.contentColumn}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text
          numberOfLines={1}
          style={[
            typography.subtitle,
            {
              color: colors.text,
              textDecorationLine: item.isCompleted ? 'line-through' : 'none',
              opacity: item.isCompleted ? 0.6 : 1,
            },
          ]}
        >
          {item.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}
        >
          {item.description || 'No description provided.'}
        </Text>

        {/* Sync status badge */}
        <Text style={[styles.badgeText, { color: badge.color, marginTop: 4 }]}>
          {badge.text}
        </Text>
      </TouchableOpacity>

      {/* Delete Button */}
      <TouchableOpacity
        style={[styles.deleteButton, { padding: spacing.sm }]}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Text style={[typography.caption, { color: colors.error, fontWeight: '700' }]}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
});

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onDelete,
  onRefresh,
  refreshing,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors, spacing, typography } = useTheme();

  const handleItemPress = useCallback(
    (id: string) => {
      navigation.navigate('TaskDetail', { taskId: id });
    },
    [navigation]
  );

  const renderItem: ListRenderItem<TaskFields> = useCallback(
    ({ item }) => (
      <TaskItem
        item={item}
        colors={colors}
        spacing={spacing}
        typography={typography}
        onPress={handleItemPress}
        onToggleComplete={onToggleComplete}
        onDelete={onDelete}
      />
    ),
    [colors, spacing, typography, handleItemPress, onToggleComplete, onDelete]
  );

  const keyExtractor = useCallback((item: TaskFields) => item.id, []);

  // Performance-optimizing layouts helper by bypassing dynamic calculations
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderEmptyComponent = () => (
    <View style={[styles.emptyContainer, { padding: spacing.xl }]}>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
        No tasks available. Tap the button above to add a task.
      </Text>
    </View>
  );

  return (
    <FlatList
      data={tasks}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={renderEmptyComponent}
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
});

export default TaskList;

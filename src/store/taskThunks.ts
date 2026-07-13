import { createAsyncThunk } from '@reduxjs/toolkit';
import { taskLocalRepo } from '../database/taskLocalRepo';
import { syncEngine } from '../database/syncEngine';
import { TaskFields, Task } from '../database/schemas';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Realm from 'realm';

/**
 * Thunk to fetch tasks. It reads from the local database immediately for offline-first speed.
 * If online, it pulls remote documents from Firestore and merges them into the local Realm database.
 */
export const fetchTasksThunk = createAsyncThunk<TaskFields[], void>(
  'tasks/fetchTasks',
  async () => {
    try {
      // 1. Fetch from Realm immediately to display local tasks instantly
      const localTasks = await taskLocalRepo.getAllTasks();
      const isOnline = syncEngine.isOnline();
      const currentUser = auth().currentUser;

      if (!isOnline || !currentUser) {
        console.log('[fetchTasksThunk] Offline or unauthenticated. Serving local tasks.');
        return localTasks;
      }

      const userId = currentUser.uid;
      console.log(`[fetchTasksThunk] Online. Fetching latest tasks from Firestore for user ${userId}...`);

      // 2. Fetch from Firestore
      const snapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .get();

      const realm = await taskLocalRepo.getRealm();

      // 3. Merge remote tasks into local database using a transaction
      realm.write(() => {
        snapshot.docs.forEach((doc: any) => {
          const remoteData = doc.data();
          const localTask = realm.objectForPrimaryKey<Task>('Task', doc.id);

          const taskData: TaskFields = {
            id: doc.id,
            title: remoteData.title,
            description: remoteData.description,
            isCompleted: remoteData.isCompleted,
            createdAt: remoteData.createdAt ? remoteData.createdAt.toDate() : new Date(),
            updatedAt: remoteData.updatedAt ? remoteData.updatedAt.toDate() : new Date(),
            syncStatus: 'synced',
          };

          if (!localTask) {
            // New task from Firestore, create it locally
            realm.create('Task', taskData, Realm.UpdateMode.Modified);
          } else if (localTask.syncStatus === 'synced') {
            // Local task exists and has no pending edits. Safely overwrite with cloud version.
            realm.create('Task', taskData, Realm.UpdateMode.Modified);
          } else {
            // Local task has pending modifications (pending_create, pending_update, pending_delete).
            // Do not overwrite to prevent losing local user edits.
            console.log(`[fetchTasksThunk] Conflict detected for task ${doc.id}. Keeping local pending changes.`);
          }
        });
      });

      // 4. Return the updated tasks list from Realm
      return await taskLocalRepo.getAllTasks();
    } catch (error) {
      console.error('[fetchTasksThunk] Error fetching or merging tasks:', error);
      throw error;
    }
  }
);

/**
 * Thunk to create a task. Inserts into Realm, then attempts Firestore push if online.
 */
export const createTaskThunk = createAsyncThunk<
  TaskFields,
  Omit<TaskFields, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
>('tasks/createTask', async (taskData: Omit<TaskFields, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
  const taskId = firestore().collection('users').doc().id; // Pre-generate Firestore ID
  const isOnline = syncEngine.isOnline();
  const currentUser = auth().currentUser;

  try {
    // 1. Create locally in Realm
    const newTask = await taskLocalRepo.createTask({ ...taskData, id: taskId }, isOnline);

    if (isOnline && currentUser) {
      const userId = currentUser.uid;
      // 2. Push to Firestore
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .doc(taskId)
        .set({
          ...newTask,
          userId,
          syncStatus: 'synced',
          createdAt: firestore.Timestamp.fromDate(newTask.createdAt),
          updatedAt: firestore.Timestamp.fromDate(newTask.updatedAt),
        });

      // 3. Update local sync status
      await taskLocalRepo.markTaskSynced(taskId);
      const syncedTask = await taskLocalRepo.getTaskById(taskId);
      if (syncedTask) return syncedTask;
    }

    return newTask;
  } catch (error) {
    console.error('[createTaskThunk] Error creating task:', error);
    throw error;
  }
});

/**
 * Thunk to update a task. Updates locally in Realm, then attempts Firestore update if online.
 */
export const updateTaskThunk = createAsyncThunk<
  TaskFields,
  { id: string; updates: Partial<Omit<TaskFields, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>> }
>('tasks/updateTask', async ({ id, updates }: { id: string; updates: Partial<Omit<TaskFields, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>> }) => {
  const isOnline = syncEngine.isOnline();
  const currentUser = auth().currentUser;

  try {
    // 1. Update locally in Realm
    const updatedTask = await taskLocalRepo.updateTask(id, updates, isOnline);

    if (isOnline && currentUser) {
      const userId = currentUser.uid;
      // 2. Update in Firestore
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .doc(id)
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          isCompleted: updatedTask.isCompleted,
          syncStatus: 'synced',
          updatedAt: firestore.Timestamp.fromDate(updatedTask.updatedAt),
        });

      // 3. Mark synced locally
      await taskLocalRepo.markTaskSynced(id);
      const syncedTask = await taskLocalRepo.getTaskById(id);
      if (syncedTask) return syncedTask;
    }

    return updatedTask;
  } catch (error) {
    console.error(`[updateTaskThunk] Error updating task ${id}:`, error);
    throw error;
  }
});

/**
 * Thunk to delete a task. Deletes locally (or marks as pending_delete), then attempts Firestore deletion.
 */
export const deleteTaskThunk = createAsyncThunk<string, string>(
  'tasks/deleteTask',
  async (id: string) => {
    const isOnline = syncEngine.isOnline();
    const currentUser = auth().currentUser;

    try {
      // 1. Delete locally (if offline, marks as pending_delete and returns immediately)
      await taskLocalRepo.deleteTask(id, isOnline);

      if (isOnline && currentUser) {
        const userId = currentUser.uid;
        // 2. Delete from Firestore
        await firestore()
          .collection('users')
          .doc(userId)
          .collection('tasks')
          .doc(id)
          .delete();

        // 3. Finalize Realm cleanup
        await taskLocalRepo.markTaskSynced(id);
      }

      return id;
    } catch (error) {
      console.error(`[deleteTaskThunk] Error deleting task ${id}:`, error);
      throw error;
    }
  }
);

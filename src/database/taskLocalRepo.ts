import Realm from 'realm';
import { Task, SyncQueue, realmConfig, TaskFields, SyncStatusType, SyncQueueFields } from './schemas';

class TaskLocalRepository {
  private realmInstance: Realm | null = null;

  /**
   * Initializes and returns the active Realm instance.
   */
  async getRealm(): Promise<Realm> {
    if (!this.realmInstance || this.realmInstance.isClosed) {
      try {
        this.realmInstance = await Realm.open(realmConfig);
      } catch (error) {
        console.error('[TaskLocalRepository] Failed to open Realm database:', error);
        throw error;
      }
    }
    return this.realmInstance;
  }

  /**
   * Closes the Realm instance safely if it is currently open.
   */
  async closeRealm(): Promise<void> {
    if (this.realmInstance && !this.realmInstance.isClosed) {
      this.realmInstance.close();
      this.realmInstance = null;
      console.log('[TaskLocalRepository] Realm database connection successfully closed.');
    }
  }

  /**
   * Fetches all local tasks sorted by creation date.
   * Excludes tasks marked as pending_delete to keep the UI clean.
   */
  async getAllTasks(): Promise<TaskFields[]> {
    const realm = await this.getRealm();
    try {
      const tasks = realm
        .objects<Task>('Task')
        .filtered('syncStatus != "pending_delete"')
        .sorted('createdAt', true);

      // Deep copy Realm results to decouple objects from Realm lifecycle threads
      return Array.from(tasks).map((t: Task) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        isCompleted: t.isCompleted,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
        syncStatus: t.syncStatus,
      }));
    } catch (error) {
      console.error('[TaskLocalRepository] Error fetching all tasks:', error);
      throw error;
    }
  }

  /**
   * Fetches a specific task by its primary key ID.
   */
  async getTaskById(id: string): Promise<TaskFields | null> {
    const realm = await this.getRealm();
    try {
      const task = realm.objectForPrimaryKey<Task>('Task', id);
      if (!task) return null;
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        isCompleted: task.isCompleted,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        syncStatus: task.syncStatus,
      };
    } catch (error) {
      console.error(`[TaskLocalRepository] Error fetching task by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Inserts a new task into the local Realm database.
   * Queues a 'create' action if offline.
   */
  async createTask(
    taskData: Omit<TaskFields, 'createdAt' | 'updatedAt' | 'syncStatus'>,
    isOnline: boolean = false
  ): Promise<TaskFields> {
    const realm = await this.getRealm();
    const now = new Date();
    const syncStatus: SyncStatusType = isOnline ? 'synced' : 'pending_create';

    const newTask: TaskFields = {
      ...taskData,
      createdAt: now,
      updatedAt: now,
      syncStatus,
    };

    try {
      realm.write(() => {
        realm.create('Task', newTask, Realm.UpdateMode.Modified);

        if (!isOnline) {
          const queueId = `q_create_${newTask.id}_${now.getTime()}`;
          realm.create('SyncQueue', {
            id: queueId,
            taskId: newTask.id,
            operation: 'create',
            payload: JSON.stringify(newTask),
            createdAt: now,
          });
        }
      });
      return newTask;
    } catch (error) {
      console.error('[TaskLocalRepository] Error executing task creation transaction:', error);
      throw error;
    }
  }

  /**
   * Updates an existing task.
   * Queues an 'update' action if offline.
   */
  async updateTask(
    id: string,
    updates: Partial<Omit<TaskFields, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>>,
    isOnline: boolean = false
  ): Promise<TaskFields> {
    const realm = await this.getRealm();
    const now = new Date();

    try {
      let updatedTask: TaskFields | null = null;
      realm.write(() => {
        const task = realm.objectForPrimaryKey<Task>('Task', id);
        if (!task) {
          throw new Error(`[TaskLocalRepository] Task not found with ID: ${id}`);
        }

        if (updates.title !== undefined) task.title = updates.title;
        if (updates.description !== undefined) task.description = updates.description;
        if (updates.isCompleted !== undefined) task.isCompleted = updates.isCompleted;
        task.updatedAt = now;

        if (!isOnline) {
          // Keep pending_create status if it hasn't synced with Firestore yet
          if (task.syncStatus !== 'pending_create') {
            task.syncStatus = 'pending_update';
          }
        } else {
          task.syncStatus = 'synced';
        }

        updatedTask = {
          id: task.id,
          title: task.title,
          description: task.description,
          isCompleted: task.isCompleted,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          syncStatus: task.syncStatus,
        };

        if (!isOnline) {
          const queueId = `q_update_${id}_${now.getTime()}`;
          realm.create('SyncQueue', {
            id: queueId,
            taskId: id,
            operation: 'update',
            payload: JSON.stringify(updatedTask),
            createdAt: now,
          });
        }
      });

      if (!updatedTask) {
        throw new Error('[TaskLocalRepository] Failed to update task: result was null.');
      }
      return updatedTask;
    } catch (error) {
      console.error(`[TaskLocalRepository] Error executing task update transaction for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a task. If offline, marks the task status as 'pending_delete' to hide from the UI,
   * and logs the deletion inside the SyncQueue to run remotely when connection returns.
   */
  async deleteTask(id: string, isOnline: boolean = false): Promise<void> {
    const realm = await this.getRealm();
    const now = new Date();

    try {
      realm.write(() => {
        const task = realm.objectForPrimaryKey<Task>('Task', id);
        if (!task) {
          console.warn(`[TaskLocalRepository] Task ID ${id} not found for deletion.`);
          return;
        }

        if (!isOnline) {
          const wasPendingCreate = task.syncStatus === 'pending_create';

          if (wasPendingCreate) {
            // Local-only task that was never synced can be deleted permanently right away.
            // Also clean up any pending queues related to it.
            const pendingOps = realm.objects<SyncQueue>('SyncQueue').filtered('taskId == $0', id);
            realm.delete(pendingOps);
            realm.delete(task);
          } else {
            // Mark task as pending_delete so it's hidden from the list, then queue delete
            task.syncStatus = 'pending_delete';
            task.updatedAt = now;

            const queueId = `q_delete_${id}_${now.getTime()}`;
            realm.create('SyncQueue', {
              id: queueId,
              taskId: id,
              operation: 'delete',
              payload: JSON.stringify({ id }),
              createdAt: now,
            });
          }
        } else {
          // Secure direct deletion when online
          realm.delete(task);
        }
      });
    } catch (error) {
      console.error(`[TaskLocalRepository] Error executing task deletion transaction for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves all items currently waiting in the sync queue sorted chronologically.
   */
  async getPendingSyncQueue(): Promise<SyncQueueFields[]> {
    const realm = await this.getRealm();
    try {
      const queue = realm.objects<SyncQueue>('SyncQueue').sorted('createdAt', false); // false = ascending (oldest first)
      return Array.from(queue).map((q: SyncQueue) => ({
        id: q.id,
        taskId: q.taskId,
        operation: q.operation,
        payload: q.payload,
        createdAt: new Date(q.createdAt),
      }));
    } catch (error) {
      console.error('[TaskLocalRepository] Error retrieving pending sync queue:', error);
      throw error;
    }
  }

  /**
   * Deletes a single sync queue item by its ID.
   */
  async removeSyncQueueItem(queueId: string): Promise<void> {
    const realm = await this.getRealm();
    try {
      realm.write(() => {
        const queueItem = realm.objectForPrimaryKey<SyncQueue>('SyncQueue', queueId);
        if (queueItem) {
          realm.delete(queueItem);
        }
      });
    } catch (error) {
      console.error(`[TaskLocalRepository] Error removing sync queue item ${queueId}:`, error);
      throw error;
    }
  }

  /**
   * Marks a task status as synced or deletes it if it was marked as pending deletion.
   */
  async markTaskSynced(taskId: string): Promise<void> {
    const realm = await this.getRealm();
    try {
      realm.write(() => {
        const task = realm.objectForPrimaryKey<Task>('Task', taskId);
        if (task) {
          if (task.syncStatus === 'pending_delete') {
            realm.delete(task);
          } else {
            task.syncStatus = 'synced';
          }
        }
      });
    } catch (error) {
      console.error(`[TaskLocalRepository] Error marking task ${taskId} as synced:`, error);
      throw error;
    }
  }
}

export const taskLocalRepo = new TaskLocalRepository();
export default taskLocalRepo;

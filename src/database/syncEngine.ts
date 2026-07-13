import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { taskLocalRepo } from './taskLocalRepo';
import { SyncQueueFields } from './schemas';

type SyncStateListener = (isSyncing: boolean) => void;

class SyncEngine {
  private isSyncing: boolean = false;
  private isConnected: boolean = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private stateListeners: Set<SyncStateListener> = new Set();

  /**
   * Subscribes to network status changes and triggers sync when transitioning online.
   */
  startSyncListener(): void {
    if (this.unsubscribeNetInfo) {
      console.warn('[SyncEngine] Sync listener is already running.');
      return;
    }

    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.isConnected;
      // NetInfo state can sometimes return null, check explicitly for true
      this.isConnected = !!state.isConnected && !!state.isInternetReachable;

      console.log(`[SyncEngine] Network connectivity transition: ${wasConnected} -> ${this.isConnected}`);

      if (this.isConnected && !wasConnected) {
        this.triggerSync();
      }
    });
  }

  /**
   * Unsubscribes from network status updates to avoid memory leaks.
   */
  stopSyncListener(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
      console.log('[SyncEngine] Sync listener successfully stopped.');
    }
  }

  /**
   * Registers a listener to observe background synchronization activity (e.g., to display loading spinners in the UI).
   */
  addStateListener(listener: SyncStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.stateListeners.forEach((listener) => listener(this.isSyncing));
  }

  /**
   * Resolves connection status.
   */
  isOnline(): boolean {
    return this.isConnected;
  }

  /**
   * Reads pending updates from Realm, constructs Firestore batch requests,
   * executes them, and updates local Realm sync states upon success.
   */
  async triggerSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[SyncEngine] Sync already in progress, skipping trigger.');
      return;
    }

    if (!this.isConnected) {
      console.log('[SyncEngine] Device is offline. Postponing remote synchronization.');
      return;
    }

    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('[SyncEngine] No authenticated user. Postponing sync until user logs in.');
      return;
    }

    const userId = currentUser.uid;
    let pendingQueue: SyncQueueFields[] = [];

    try {
      pendingQueue = await taskLocalRepo.getPendingSyncQueue();
    } catch (error) {
      console.error('[SyncEngine] Failed to retrieve pending sync queue from Realm:', error);
      return;
    }

    if (pendingQueue.length === 0) {
      console.log('[SyncEngine] Local queue is empty. Sync is up to date.');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    console.log(`[SyncEngine] Initiating sync for ${pendingQueue.length} queued operations...`);

    // Firestore batch limits operations to 500. We process in chunks of 400 to remain safe.
    const CHUNK_SIZE = 400;
    const queueChunks: SyncQueueFields[][] = [];
    for (let i = 0; i < pendingQueue.length; i += CHUNK_SIZE) {
      queueChunks.push(pendingQueue.slice(i, i + CHUNK_SIZE));
    }

    try {
      for (const chunk of queueChunks) {
        const batch = firestore().batch();
        const operationsToFinalize: SyncQueueFields[] = [];

        chunk.forEach((item) => {
          const docRef = firestore()
            .collection('users')
            .doc(userId)
            .collection('tasks')
            .doc(item.taskId);

          try {
            const taskData = JSON.parse(item.payload);

            if (item.operation === 'create') {
              // Write full object with synced status to Firestore
              batch.set(docRef, {
                ...taskData,
                userId,
                syncStatus: 'synced',
                createdAt: firestore.Timestamp.fromDate(new Date(taskData.createdAt)),
                updatedAt: firestore.Timestamp.fromDate(new Date(taskData.updatedAt)),
              }, { merge: true });
              operationsToFinalize.push(item);
            } else if (item.operation === 'update') {
              // Update properties
              batch.update(docRef, {
                title: taskData.title,
                description: taskData.description,
                isCompleted: taskData.isCompleted,
                syncStatus: 'synced',
                updatedAt: firestore.Timestamp.fromDate(new Date(taskData.updatedAt)),
              });
              operationsToFinalize.push(item);
            } else if (item.operation === 'delete') {
              // Delete from remote database
              batch.delete(docRef);
              operationsToFinalize.push(item);
            }
          } catch (parseError) {
            console.error(`[SyncEngine] Failed to parse sync payload for queue ID ${item.id}:`, parseError);
            // Remove corrupt record from sync queue directly to prevent blocking other operations
            taskLocalRepo.removeSyncQueueItem(item.id);
          }
        });

        if (operationsToFinalize.length > 0) {
          // Execute firestore operations
          await batch.commit();

          // Sync database locally to resolve statuses (e.g. pending_delete -> fully deleted, or pending_create/update -> synced)
          for (const item of operationsToFinalize) {
            await taskLocalRepo.markTaskSynced(item.taskId);
            await taskLocalRepo.removeSyncQueueItem(item.id);
          }
        }
      }

      console.log('[SyncEngine] Synchronization batch cycle completed successfully.');
    } catch (error) {
      console.error('[SyncEngine] Critical failure committing sync batch to Firestore:', error);
      // Keep items in Realm SyncQueue to attempt sync on next transition or manual trigger
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }
}

export const syncEngine = new SyncEngine();
export default syncEngine;

import Realm from 'realm';

export type SyncStatusType = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
export type SyncOperationType = 'create' | 'update' | 'delete';

export interface TaskFields {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatusType;
}

export interface SyncQueueFields {
  id: string;
  taskId: string;
  operation: SyncOperationType;
  payload: string; // JSON string representation of Task data
  createdAt: Date;
}

export class Task extends Realm.Object<Task> implements TaskFields {
  id!: string;
  title!: string;
  description!: string;
  isCompleted!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  syncStatus!: SyncStatusType;

  static schema: Realm.ObjectSchema = {
    name: 'Task',
    primaryKey: 'id',
    properties: {
      id: 'string',
      title: 'string',
      description: 'string',
      isCompleted: 'bool',
      createdAt: 'date',
      updatedAt: 'date',
      syncStatus: 'string',
    },
  };
}

export class SyncQueue extends Realm.Object<SyncQueue> implements SyncQueueFields {
  id!: string;
  taskId!: string;
  operation!: SyncOperationType;
  payload!: string;
  createdAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'SyncQueue',
    primaryKey: 'id',
    properties: {
      id: 'string',
      taskId: 'string',
      operation: 'string',
      payload: 'string',
      createdAt: 'date',
    },
  };
}

// Realm Configuration
export const realmConfig: Realm.Configuration = {
  schema: [Task, SyncQueue],
  schemaVersion: 1,
  deleteRealmIfMigrationNeeded: true, // For development ease; should be migrated in production
};

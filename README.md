# Cross-Platform Task Management App: Engineering Architecture & Guide

This document outlines the architectural blueprint, structural configurations, setup details, and resiliency considerations for the Cross-Platform Task Management mobile application built in React Native, TypeScript, Realm, and Firebase.

---

## 1. Architecture Overview

The codebase is built around **strict separation of concerns** and a **feature-based modular structure**, facilitating scalability, offline reliability, and isolation of side effects.

```
src/
├── config/             # App-wide global settings and environment validations
├── database/           # Local databases schemas, Repository patterns, and Sync engine
├── features/           # Feature modules: auth, tasks, settings, notifications
│   ├── [feature]/
│   │   ├── components/ # Private components scoped strictly to this feature
│   │   ├── redux/      # Feature states (Redux slices)
│   │   ├── screens/    # Screen view elements
│   │   └── services/   # Data fetching, network queries, or hardware services
├── navigation/         # Navigators and route definition parameters
├── shared/             # Shared styling (theme), hooks, utilities, and components
└── store/              # Global Redux store configuration and thunks
```

### Key Design Patterns

#### Feature-Based Organization
Files are grouped by vertical domain features rather than horizontal technical groupings. For example, all code associated with Authentication resides under `src/features/auth/`, isolating changes to specific parts of the app.

#### Repository Pattern (`taskLocalRepo.ts`)
The UI layers and Redux thunks never interact directly with raw Realm database queries. The repository decouples database transactions from core application flows.

#### Offline-First Synchronization Model (`syncEngine.ts`)
Users perform write actions instantly. If the client is offline, modifications are written to Realm and logged sequentially in the `SyncQueue`. When network connectivity restores:
- NetInfo triggers the `SyncEngine`.
- Outstanding queues are processed in batches of 400.
- Operations are replayed to Firestore.
- Local records transition from `pending_*` to `synced`.

---

## 2. Third-Party Dependencies Matrix

| Package Name | Category | Selection Rationale / Critical Purpose |
| :--- | :--- | :--- |
| `react-native-config` | Configuration | Enables multi-env builds using native variables for android/ios. |
| `@reduxjs/toolkit` | Global State | Centralized application state manager; handles async thunks and decouples UI from state syncs. |
| `realm` | Local Database | Fast local object database supporting thread-safety, transaction isolation, and query filtering. |
| `@react-native-firebase/auth` | Authentication | Secure user identity provider handling token refreshes, signup validation, and logins. |
| `@react-native-firebase/firestore` | Cloud Database | Scalable, real-time database that stores task data, serving as the master remote store. |
| `@react-native-community/netinfo` | Connectivity | Provides real-time network reachability states for the Sync Engine. |
| `@react-navigation/native` | Navigation | Native navigation container managing UI transitions and deep links. |
| `@notifee/react-native` | Local Alerts | Handles local notifications, custom notification channels, and trigger reminders. |

---

## 3. Multi-Environment Execution Protocols

Different environments use dedicated configurations (`.env.development`, `.env.staging`, `.env.production`) built dynamically using `react-native-config`.

### Clean-Start Command Templates

First, ensure node modules are resolved:
```bash
npm install
```

#### Android Builds

Run the clean-start gradle scripts:
```bash
# Clear any Gradle caches
cd android && ./gradlew clean && cd ..
```

Execute run scripts per scheme:
```bash
# Development Build
npx react-native run-android --mode=development --appIdSuffix=dev

# Staging Build
npx react-native run-android --mode=staging --appIdSuffix=staging

# Production Build
npx react-native run-android --mode=production
```

#### iOS Builds

Install Pods before running:
```bash
cd ios && pod install && cd ..
```

Execute run scripts specifying configuration and schemes:
```bash
# Development Build
npx react-native run-ios --scheme "Taskify.Dev" --configuration Debug

# Staging Build
npx react-native run-ios --scheme "Taskify.Staging" --configuration Release

# Production Build
npx react-native run-ios --scheme "Taskify.Prod" --configuration Release
```

---

## 4. Resiliency & Constraints Log

### Conflict Resolution Strategy
When the app connects online, it pulls remote Firestore updates and merges them with the local database. If a conflict occurs (a task is updated locally but has remote changes):
- **Rule**: If the local task's syncStatus is `pending_create` or `pending_update`, **local modifications are preserved**, and the remote changes are ignored.
- **Rule**: If the local status is `synced`, **the remote version overwrites the local copy**, ensuring the client displays the latest cloud data.

### Limits & Boundaries
1. **FCM Payload Limit**: Maximum FCM push payload size is **4KB**. Large descriptions should be truncated or queried lazily via document IDs.
2. **Firestore Batch Write Size**: Firestore batches are capped at **500 operations**. The `SyncEngine` splits sync requests into chunks of **400** to prevent transaction failures.
3. **Deep Linking Scope**: Triggers rely on `taskify://task/:taskId`. If the requested ID does not exist in local storage or Firestore, the app shows a fallback "Task not found" state.
4. **Offline Queue Size**: In-memory queue operations are written in Realm's SQLite-backed engine. Large queues (10,000+ items) will run sequentially, causing small delays when rejoining active connections.

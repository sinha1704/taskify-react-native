import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/redux/authSlice';
import tasksReducer from './tasksSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
  },
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Disable checks for Date object properties of Task data structures inside actions and state
        ignoredActions: [
          'tasks/fetchTasks/fulfilled',
          'tasks/createTask/fulfilled',
          'tasks/updateTask/fulfilled',
          'tasks/createTask/pending',
          'tasks/updateTask/pending',
        ],
        ignoredActionPaths: [
          'payload.createdAt',
          'payload.updatedAt',
          'meta.arg.createdAt',
          'meta.arg.updatedAt',
          'meta.arg.updates.createdAt',
          'meta.arg.updates.updatedAt',
        ],
        ignoredPaths: ['tasks.items'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

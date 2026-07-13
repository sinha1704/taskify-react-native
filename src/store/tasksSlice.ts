import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TaskFields } from '../database/schemas';
import { fetchTasksThunk, createTaskThunk, updateTaskThunk, deleteTaskThunk } from './taskThunks';

export interface TasksState {
  items: TaskFields[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  isLoading: false,
  isSyncing: false,
  error: null,
};

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasksSyncing: (state: TasksState, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
    clearTasksError: (state: TasksState) => {
      state.error = null;
    },
  },
  extraReducers: (builder: any) => {
    // fetchTasksThunk
    builder.addCase(fetchTasksThunk.pending, (state: TasksState) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTasksThunk.fulfilled, (state: TasksState, action: PayloadAction<TaskFields[]>) => {
      state.items = action.payload;
      state.isLoading = false;
    });
    builder.addCase(fetchTasksThunk.rejected, (state: TasksState, action: any) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch tasks.';
    });

    // createTaskThunk
    builder.addCase(createTaskThunk.fulfilled, (state: TasksState, action: PayloadAction<TaskFields>) => {
      state.items.unshift(action.payload); // Insert new tasks at the beginning
    });
    builder.addCase(createTaskThunk.rejected, (state: TasksState, action: any) => {
      state.error = action.error.message || 'Failed to create task.';
    });

    // updateTaskThunk
    builder.addCase(updateTaskThunk.fulfilled, (state: TasksState, action: PayloadAction<TaskFields>) => {
      const index = state.items.findIndex((item: TaskFields) => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    });
    builder.addCase(updateTaskThunk.rejected, (state: TasksState, action: any) => {
      state.error = action.error.message || 'Failed to update task.';
    });

    // deleteTaskThunk
    builder.addCase(deleteTaskThunk.fulfilled, (state: TasksState, action: PayloadAction<string>) => {
      state.items = state.items.filter((item: TaskFields) => item.id !== action.payload);
    });
    builder.addCase(deleteTaskThunk.rejected, (state: TasksState, action: any) => {
      state.error = action.error.message || 'Failed to delete task.';
    });
  },
});

export const { setTasksSyncing, clearTasksError } = tasksSlice.actions;
export default tasksSlice.reducer;

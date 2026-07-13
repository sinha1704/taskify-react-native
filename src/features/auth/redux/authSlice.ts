import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthUser } from '../services/authService';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Initially loading while resolving auth state listener
  authError: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading: (state: AuthState, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setAuthUser: (state: AuthState, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
      state.authError = null;
    },
    setAuthError: (state: AuthState, action: PayloadAction<string | null>) => {
      state.authError = action.payload;
      state.isLoading = false;
    },
    clearAuth: (state: AuthState) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.authError = null;
    },
  },
});

export const { setAuthLoading, setAuthUser, setAuthError, clearAuth } = authSlice.actions;
export default authSlice.reducer;

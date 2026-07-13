import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Maps the Firebase user representation to our application-scoped AuthUser interface.
 */
const mapFirebaseUser = (firebaseUser: FirebaseAuthTypes.User | null): AuthUser | null => {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
  };
};

export const authService = {
  /**
   * Registers a new user with email and password.
   */
  async signUpWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const mappedUser = mapFirebaseUser(userCredential.user);
      if (!mappedUser) {
        throw new Error('[AuthService] Registration succeeded but returned an empty user object.');
      }
      return mappedUser;
    } catch (error: any) {
      console.error('[AuthService] Error in signUpWithEmail:', error);
      throw new Error(error.message || 'Registration failed. Please check your credentials.');
    }
  },

  /**
   * Signs in an existing user with email and password.
   */
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const mappedUser = mapFirebaseUser(userCredential.user);
      if (!mappedUser) {
        throw new Error('[AuthService] Login succeeded but returned an empty user object.');
      }
      return mappedUser;
    } catch (error: any) {
      console.error('[AuthService] Error in signInWithEmail:', error);
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    }
  },

  /**
   * Signs out the currently authenticated user.
   */
  async signOut(): Promise<void> {
    try {
      await auth().signOut();
      console.log('[AuthService] Successfully signed out user.');
    } catch (error: any) {
      console.error('[AuthService] Error in signOut:', error);
      throw new Error(error.message || 'Logout failed.');
    }
  },

  /**
   * Attaches a listener to Firebase auth state changes.
   * Returns an unsubscribe function to prevent resource leaks.
   */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser: FirebaseAuthTypes.User | null) => {
      const mappedUser = mapFirebaseUser(firebaseUser);
      callback(mappedUser);
    });
    return unsubscribe;
  },
};

export default authService;

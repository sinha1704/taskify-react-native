import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '../../../navigation/types';
import { authService } from '../services/authService';
import { useTheme } from '../../../shared/theme/ThemeContext';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const { colors, spacing, typography } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Email regex validation
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('Email is required.');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  // Password validation
  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('Password is required.');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleLogin = async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.signInWithEmail(email, password);
      // RootNavigator will automatically pick up user updates from the listener
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to sign in. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerSection}>
            <Text style={[typography.h1, { color: colors.primary, marginBottom: spacing.sm }]}>
              Taskify
            </Text>
            <Text style={[typography.subtitle, { color: colors.textSecondary }]}>
              Welcome back! Please login to your account.
            </Text>
          </View>

          <View style={styles.formSection}>
            {errorMessage && (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + '1A', borderColor: colors.error, padding: spacing.md, marginBottom: spacing.md }]}>
                <Text style={[typography.caption, { color: colors.error }]}>{errorMessage}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.caption, { color: colors.text, marginBottom: spacing.xs, fontWeight: '600' }]}>
                Email Address
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: emailError ? colors.error : colors.border,
                    color: colors.text,
                    padding: spacing.md,
                  },
                ]}
                placeholder="Enter email address"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={(text: string) => {
                  setEmail(text);
                  if (emailError) validateEmail(text);
                }}
                onBlur={() => validateEmail(email)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {emailError && (
                <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
                  {emailError}
                </Text>
              )}
            </View>

            {/* Password Field */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.caption, { color: colors.text, marginBottom: spacing.xs, fontWeight: '600' }]}>
                Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: passwordError ? colors.error : colors.border,
                    color: colors.text,
                    padding: spacing.md,
                  },
                ]}
                placeholder="Enter password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={(text: string) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                }}
                onBlur={() => validatePassword(password)}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
              {passwordError && (
                <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
                  {passwordError}
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary, padding: spacing.md }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={[typography.button, { color: colors.onPrimary }]}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.footerSection, { marginTop: spacing.xl }]}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  formSection: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  errorContainer: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;

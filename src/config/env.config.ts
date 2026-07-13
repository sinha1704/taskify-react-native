import Config from 'react-native-config';

export interface AppEnvConfig {
  ENV: 'development' | 'staging' | 'production' | string;
  FIREBASE_API_KEY: string;
  FIRESTORE_DB_URL: string;
  REALM_APP_ID: string;
}

const requiredKeys: (keyof AppEnvConfig)[] = [
  'ENV',
  'FIREBASE_API_KEY',
  'FIRESTORE_DB_URL',
  'REALM_APP_ID',
];

/**
 * Validates the environment variables loaded by react-native-config.
 * Throws a comprehensive error if any required configurations are missing.
 */
const validateEnv = (): AppEnvConfig => {
  const config: Partial<AppEnvConfig> = {
    ENV: Config.ENV,
    FIREBASE_API_KEY: Config.FIREBASE_API_KEY,
    FIRESTORE_DB_URL: Config.FIRESTORE_DB_URL,
    REALM_APP_ID: Config.REALM_APP_ID,
  };

  const missingKeys: string[] = [];
  requiredKeys.forEach((key) => {
    if (!config[key]) {
      missingKeys.push(key);
    }
  });

  if (missingKeys.length > 0) {
    console.error('[EnvConfig Error] Initialization failed due to missing required configurations:', missingKeys);
    throw new Error(
      `[EnvConfig Error] Missing required environment variables: ${missingKeys.join(
        ', '
      )}. Please verify your active .env file configuration.`
    );
  }

  console.log(`[EnvConfig] Successfully loaded configuration for environment: ${config.ENV}`);
  return config as AppEnvConfig;
};

export const EnvConfig = validateEnv();
export default EnvConfig;

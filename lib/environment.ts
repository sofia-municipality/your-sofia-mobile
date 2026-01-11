import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'api-environment'

export type Environment = 'development' | 'production' | 'staging'

export interface EnvironmentConfig {
  name: Environment
  apiUrl: string
  displayName: string
}

export const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  development: {
    name: 'development',
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    displayName: 'Development (Local)',
  },
  staging: {
    name: 'staging',
    apiUrl: process.env.EXPO_PUBLIC_STAGING_API_URL || 'https://staging-your.sofia.bg',
    displayName: 'Staging',
  },
  production: {
    name: 'production',
    apiUrl: process.env.EXPO_PUBLIC_PRODUCTION_API_URL || 'https://your.sofia.bg',
    displayName: 'Production',
  },
}

// Default to development in dev mode, production in production builds
const DEFAULT_ENV: Environment = __DEV__ ? 'development' : 'production'

class EnvironmentManager {
  private currentEnv: Environment = DEFAULT_ENV
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      console.log('[EnvironmentManager] Loaded stored environment:', stored)
      if (stored && this.isValidEnvironment(stored)) {
        this.currentEnv = stored as Environment
        console.log(
          '[EnvironmentManager] Using stored environment:',
          this.currentEnv,
          'API URL:',
          this.getApiUrl()
        )
      } else {
        console.log(
          '[EnvironmentManager] Using default environment:',
          this.currentEnv,
          'API URL:',
          this.getApiUrl()
        )
      }
    } catch (error) {
      console.warn('Failed to load environment from storage:', error)
    }

    this.initialized = true
  }

  private isValidEnvironment(env: string): env is Environment {
    return env in ENVIRONMENTS
  }

  getCurrentEnvironment(): Environment {
    return this.currentEnv
  }

  getCurrentConfig(): EnvironmentConfig {
    return ENVIRONMENTS[this.currentEnv]
  }

  getApiUrl(): string {
    return this.getCurrentConfig().apiUrl
  }

  async setEnvironment(env: Environment): Promise<void> {
    if (!this.isValidEnvironment(env)) {
      throw new Error(`Invalid environment: ${env}`)
    }

    this.currentEnv = env

    try {
      await AsyncStorage.setItem(STORAGE_KEY, env)
      console.log(
        '[EnvironmentManager] Saved environment to storage:',
        env,
        'API URL:',
        this.getApiUrl()
      )
    } catch (error) {
      console.error('Failed to save environment to storage:', error)
      throw error
    }
  }

  getAllEnvironments(): EnvironmentConfig[] {
    return Object.values(ENVIRONMENTS)
  }

  // Only allow environment switching in development mode
  canSwitchEnvironment(): boolean {
    return __DEV__
  }
}

export const environmentManager = new EnvironmentManager()

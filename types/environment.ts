/**
 * Environment-related enums and types for the Bridge application
 */

export enum AppEnvironment {
  DEV = 'dev',
  STAGE = 'stage',
  PROD = 'prod',
}
/**
 * Helper functions for environment checking
 */
export const isDevelopment = (): boolean => process.env.NEXT_PUBLIC_APP_ENV === AppEnvironment.DEV;
export const isStaging = (): boolean => process.env.NEXT_PUBLIC_APP_ENV === AppEnvironment.STAGE;
export const isProduction = (): boolean => process.env.NEXT_PUBLIC_APP_ENV === AppEnvironment.PROD;

/**
 * Get current app environment with fallback
 */
export const getCurrentAppEnvironment = (): AppEnvironment => {
  return (process.env.NEXT_PUBLIC_APP_ENV as AppEnvironment) || AppEnvironment.DEV;
};

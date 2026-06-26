/**
 * Server-side logger utility using Pino
 * Provides structured logging with appropriate formatting for development and production
 */

import pino from 'pino';

// Define log levels
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Log message constants
export const LOG_MESSAGES = {
  REQUEST: 'API Request from Bridge',
  RESPONSE: 'API Response to Bridge',
  ERROR: 'API Error Response from Bridge',
} as const;

const isBrowser = typeof window !== 'undefined';

// Create logger configuration based on environment
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // Base configuration
  const baseConfig = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    base: {
      service: 'bridge-app',
      version: process.env.npm_package_version,
      environment: process.env.NEXT_PUBLIC_APP_ENV,
      ...(isBrowser ? {} : { pid: process.pid, hostname: process.env.HOSTNAME || 'localhost' }),
    },
  };

  // Browser: pino ships a browser build that routes through console.*
  // pino-pretty uses worker_threads and cannot run in the browser, so skip transport here.
  if (isBrowser) {
    return pino({
      ...baseConfig,
      browser: { asObject: true },
    });
  }

  // Development (server) configuration with pretty printing
  if (isDevelopment) {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname,service,version,environment',
          messageFormat: '{service}[{environment}] {msg}',
        },
      },
    });
  }

  // Test configuration (minimal output)
  if (isTest) {
    return pino({
      ...baseConfig,
      level: 'error',
    });
  }

  // Production (server) configuration (structured JSON)
  return pino({
    ...baseConfig,
    formatters: {
      level: label => {
        return { level: label };
      },
    },
  });
};

// Create the logger instance
export const logger = createLogger();

// Convenience methods with additional context
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

// API-specific logger with request context
export const createAPILogger = (req: { method?: string; url?: string; headers?: any }) => {
  return logger.child({
    component: 'api',
    method: req.method,
    path: req.url,
    correlationId: req.headers?.['x-correlation-id'] || req.headers?.['x-request-id'],
    userAgent: req.headers?.['user-agent'],
  });
};

// Controller-specific logger
export const createControllerLogger = (controllerName: string, operation?: string) => {
  return logger.child({
    component: 'controller',
    controller: controllerName,
    operation,
  });
};

// Client-side (browser) logger scoped by module name
export const createClientLogger = (module: string) => {
  return logger.child({ component: 'client', module });
};

/**
 * Log API request with stringified body
 * @param logger - Pino logger instance
 * @param requestData - Request data to log
 * @param metaData - Optional metadata fields to log
 */
export const logRequest = (
  logger: pino.Logger,
  requestData: any,
  metaData?: Record<string, any>
) => {
  logger.info(
    {
      requestBody: JSON.stringify(requestData),
      ...metaData,
    },
    LOG_MESSAGES.REQUEST
  );
};

/**
 * Log API response with stringified body
 * @param logger - Pino logger instance
 * @param responseData - Response data to log
 * @param requestId - Optional request ID for tracing
 * @param metaData - Optional metadata fields to log
 */
export const logResponse = (
  logger: pino.Logger,
  responseData: any,
  requestId?: string,
  metaData?: Record<string, any>
) => {
  logger.info(
    {
      requestId,
      responseBody: JSON.stringify(responseData),
      ...metaData,
    },
    LOG_MESSAGES.RESPONSE
  );
};

/**
 * Log API error response with stringified body
 * @param logger - Pino logger instance
 * @param errorData - Error response data to log
 * @param requestId - Optional request ID for tracing
 * @param metaData - Optional metadata fields to log
 */
export const logErrorResponse = (
  logger: pino.Logger,
  errorData: any,
  requestId?: string,
  metaData?: Record<string, any>
) => {
  logger.error(
    {
      requestId,
      errorBody: JSON.stringify(errorData),
      ...metaData,
    },
    LOG_MESSAGES.ERROR
  );
};

// Export default logger for backward compatibility
export default logger;

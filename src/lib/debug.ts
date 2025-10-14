/**
 * Debug utility for conditional logging
 * 
 * In development: All logs are shown
 * In production: Only errors are shown
 * 
 * Usage:
 * import { debug } from '@/lib/debug';
 * 
 * debug.log('Info message');      // Only in dev
 * debug.warn('Warning message');  // Only in dev
 * debug.error('Error message');   // Always shown
 */

const isDevelopment = import.meta.env.DEV;

export const debug = {
  /**
   * Log informational messages (development only)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log warning messages (development only)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (always shown, even in production)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log with emoji prefix for easy scanning
   */
  success: (...args: any[]) => {
    if (isDevelopment) {
      console.log('✅', ...args);
    }
  },

  /**
   * Log performance metrics (development only)
   */
  perf: (label: string, fn: () => void) => {
    if (isDevelopment) {
      console.time(label);
      fn();
      console.timeEnd(label);
    } else {
      fn();
    }
  },

  /**
   * Group related logs (development only)
   */
  group: (label: string, fn: () => void) => {
    if (isDevelopment) {
      console.group(label);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  },

  /**
   * Check if debug mode is enabled
   */
  isEnabled: () => isDevelopment,
};

// Export individual functions for convenience
export const { log, warn, error, success, perf, group } = debug;

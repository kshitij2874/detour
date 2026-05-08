/**
 * Lightweight logger utility.
 * In production builds, all log output is suppressed.
 * In development (import.meta.env.DEV), messages are forwarded to the console.
 */
const isDev = import.meta.env.DEV;

const logger = {
  /**
   * Log a debug/info message (dev only).
   * @param {string} msg - Message to log
   * @param {...*} args - Additional arguments
   */
  log: (msg, ...args) => {
    if (isDev) console.log(`[Detour] ${msg}`, ...args);
  },

  /**
   * Log a warning (dev only).
   * @param {string} msg - Warning message
   * @param {...*} args - Additional arguments
   */
  warn: (msg, ...args) => {
    if (isDev) console.warn(`[Detour] ${msg}`, ...args);
  },

  /**
   * Log an error (dev only).
   * @param {string} msg - Error message
   * @param {Error|*} [err] - Error object or extra context
   * @param {...*} args - Additional arguments
   */
  error: (msg, err, ...args) => {
    if (isDev) console.error(`[Detour] ${msg}`, err, ...args);
  },
};

export default logger;

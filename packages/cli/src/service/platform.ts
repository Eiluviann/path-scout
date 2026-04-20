import { platform } from 'node:os';

/**
 * Returns true if the current platform is macOS.
 */
export function isMac(): boolean {
  return platform() === 'darwin';
}

/**
 * Returns true if the current platform is Linux.
 */
export function isLinux(): boolean {
  return platform() === 'linux';
}

/**
 * Returns true if the current platform is Windows.
 */
export function isWindows(): boolean {
  return platform() === 'win32';
}

/**
 * Escapes special regex characters in a literal string.
 * Used when compiling mixed segment patterns to prevent
 * literal characters from being interpreted as regex syntax.
 *
 * @param value - The literal string to escape
 * @returns The escaped string safe for use in a RegExp
 *
 * @example
 * escapeRegex("v1.0")
 * // → "v1\\.0"
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import { PathScoutError } from './errors.js';

/**
 * Resolves all {{references}} in args to their captured wildcard values.
 * Static values are passed through as-is.
 * Returns a plain record ready to pass to action.resolve.
 *
 * @param args - The raw args from the matched node before interpolation
 * @param capturedWildcards - The normalized captured wildcard values from the trie match
 * @returns A fully resolved record of argument names to string values
 * @throws {PathScoutError} If a referenced wildcard is not found in capturedWildcards
 *
 * @example
 * interpolate(
 *   { instance: '{{env}}', table: '{{sn:table}}', filter: 'active=true' },
 *   { env: 'dev', 'sn:table': 'sc_req_item' }
 * )
 * // → { instance: 'dev', table: 'sc_req_item', filter: 'active=true' }
 */
export function interpolate(
  args: Record<string, string>,
  capturedWildcards: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(args).map(([param, template]) => [
      param,
      resolveTemplate(template, capturedWildcards),
    ])
  );
}

/**
 * Resolves a single template string against captured wildcard values.
 * A template with no {{ }} is returned as-is.
 * Each {{ }} reference is replaced with the corresponding captured value.
 *
 * @param template - The template string to resolve
 * @param capturedWildcards - The normalized captured wildcard values
 * @returns The resolved string value
 * @throws {PathScoutError} If a referenced wildcard is not found in capturedWildcards
 */
function resolveTemplate(
  template: string,
  capturedWildcards: Record<string, string>
): string {
  if (!template.includes('{{')) return template;

  return template.replace(/\{\{(.+?)\}\}/g, (_, name) => {
    if (!(name in capturedWildcards)) {
      throw new PathScoutError(
        `Interpolation failed: "{{${name}}}" not found in captured wildcards. ` +
        `Ensure the wildcard is present in the route path.`
      );
    }

    return capturedWildcards[name];
  });
}

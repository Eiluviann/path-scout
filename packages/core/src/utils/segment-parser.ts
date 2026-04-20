import type { PatternToken } from '../types/trie.types.js';
import type { WildcardRegistry } from '../wildcard-registry.js';
import { escapeRegex } from './regex.js';

/**
 * Parses a segment key from the route config into an ordered list of tokens.
 * Handles pure literals, pure wildcards, and mixed segments.
 * Wildcards are resolved against the registry — throws UnknownWildcardError
 * if a referenced wildcard is not registered.
 *
 * @param key - The segment key string e.g. "dev", "{{word}}", "v{{number}}-{{word}}"
 * @param registry - The wildcard registry to resolve wildcard references against
 * @returns An ordered list of pattern tokens
 *
 * @example
 * parseSegmentKey("v{{number}}-{{word}}", registry)
 * // → [
 * //     { type: 'literal', value: 'v' },
 * //     { type: 'wildcard', wildcard: RegisteredWildcard(number) },
 * //     { type: 'literal', value: '-' },
 * //     { type: 'wildcard', wildcard: RegisteredWildcard(word) }
 * //   ]
 */
export function parseSegmentKey(
  key: string,
  registry: WildcardRegistry
): PatternToken[] {
  const tokens: PatternToken[] = [];
  let remaining = key;

  while (remaining.length > 0) {
    const openBracketIndex = remaining.indexOf('{{');

    if (openBracketIndex === -1) {
      tokens.push({ type: 'literal', value: remaining });
      break;
    }

    if (openBracketIndex > 0) {
      tokens.push({ type: 'literal', value: remaining.slice(0, openBracketIndex) });
    }

    const closeBracketIndex = remaining.indexOf('}}', openBracketIndex);
    const name = remaining.slice(openBracketIndex + 2, closeBracketIndex);
    const wildcard = registry.resolve(name);

    tokens.push({ type: 'wildcard', wildcard });
    remaining = remaining.slice(closeBracketIndex + 2);
  }

  return tokens;
}

/**
 * Compiles an ordered list of pattern tokens into a regex.
 * Each wildcard becomes a capture group using its pattern.
 * Literals are escaped before inclusion.
 *
 * @param tokens - The ordered list of pattern tokens
 * @returns A compiled RegExp
 */
export function compileSegmentPattern(tokens: PatternToken[]): RegExp {
  let pattern = '^';

  for (const token of tokens) {
    if (token.type === 'literal') {
      pattern += escapeRegex(token.value);
    } else {
      pattern += `(${token.wildcard.getPattern().source})`;
    }
  }

  pattern += '$';
  return new RegExp(pattern);
}

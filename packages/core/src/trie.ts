import { ParsedQuery, RouteConfig, RouteLeaf, TrieMatch } from './types';
import { WildcardRegistry, RegisteredWildcard } from './wildcard-registry';
import { validateTrie } from './trie-validator';

// #region Internal Types

type SegmentToken =
  | { type: 'literal'; value: string }
  | { type: 'wildcard'; name: string; wildcard: RegisteredWildcard };

/**
 * Represents a compiled segment pattern at a single trie level.
 * Handles pure literals, pure wildcards, and mixed segments uniformly.
 */
interface SegmentMatcher {
  /** Ordered tokens parsed from the segment key e.g. "v{{number}}-{{word}}" */
  tokens: SegmentToken[];
  /** Ordered capture names left-to-right, used to map regex groups to named captures */
  captureNames: string[];
  /** Pre-compiled regex if all wildcards are static, null if any wildcard has recompileOnMatch */
  cachedRegex: RegExp | null;
  /** Child node to continue matching from if this segment matches */
  child: TrieNode;
  /** Returns cached regex or builds a fresh one for recompileOnMatch wildcards */
  getRegex(): RegExp;
}

interface TrieNode {
  /**
   * Fast path for pure literal segments — O(1) lookup.
   * Checked before matchers at every level.
   */
  literals: Map<string, TrieNode>;
  /**
   * Handles wildcard and mixed segment matching.
   * Evaluated in declaration order — first match wins.
   */
  matchers: SegmentMatcher[];
  /**
   * Present only when a complete route ends at this node.
   * Null for intermediate nodes that are part of a longer path.
   */
  leaf: RouteLeaf | null;
}

// #endregion

// #region Standalone Functions

/**
 * Creates an empty trie node.
 */
export function createTrieNode(): TrieNode {
  return {
    literals: new Map(),
    matchers: [],
    leaf: null,
  };
}

/**
 * Determines whether a route config value is a RouteLeaf or a nested RouteConfig.
 */
export function isRouteLeaf(value: RouteConfig | RouteLeaf): value is RouteLeaf {
  return 'action' in value && 'args' in value;
}

/**
 * Parses a segment key from the route config into an ordered list of tokens.
 * Handles pure literals, pure wildcards, and mixed segments.
 *
 * @example
 * parseSegmentKey("v{{number}}-{{word}}", registry)
 * // → [
 * //     { type: 'literal', value: 'v' },
 * //     { type: 'wildcard', name: 'number', wildcard: ... },
 * //     { type: 'literal', value: '-' },
 * //     { type: 'wildcard', name: 'word', wildcard: ... }
 * //   ]
 */
export function parseSegmentKey(
  key: string,
  registry: WildcardRegistry
): SegmentToken[] {
  const tokens: SegmentToken[] = [];
  let remaining = key;

  while (remaining.length > 0) {
    const openIdx = remaining.indexOf('{{');

    if (openIdx === -1) {
      tokens.push({ type: 'literal', value: remaining });
      break;
    }

    if (openIdx > 0) {
      tokens.push({ type: 'literal', value: remaining.slice(0, openIdx) });
    }

    const closeIdx = remaining.indexOf('}}', openIdx);
    const name = remaining.slice(openIdx + 2, closeIdx);
    const wildcard = registry.resolve(name);

    tokens.push({ type: 'wildcard', name, wildcard });
    remaining = remaining.slice(closeIdx + 2);
  }

  return tokens;
}

/**
 * Builds a compiled regex from segment tokens.
 * Returns null if any wildcard has recompileOnMatch — regex must be built fresh each time.
 */
export function buildSegmentRegex(
  tokens: SegmentToken[],
  registry: WildcardRegistry
): RegExp | null {
  let pattern = '^';
  let hasRecompile = false;

  for (const token of tokens) {
    if (token.type === 'literal') {
      pattern += escapeRegex(token.value);
    } else {
      const wildcardPattern = registry.getPattern(token.wildcard);
      if ('recompileOnMatch' in token.wildcard && token.wildcard.recompileOnMatch) {
        hasRecompile = true;
      }
      pattern += `(${wildcardPattern.source})`;
    }
  }

  pattern += '$';
  return hasRecompile ? null : new RegExp(pattern);
}

/**
 * Builds a fresh regex from tokens at match time.
 * Only called for segments containing recompileOnMatch wildcards.
 */
export function buildFreshRegex(
  tokens: SegmentToken[],
  registry: WildcardRegistry
): RegExp {
  let pattern = '^';

  for (const token of tokens) {
    if (token.type === 'literal') {
      pattern += escapeRegex(token.value);
    } else {
      pattern += `(${registry.getPattern(token.wildcard).source})`;
    }
  }

  return new RegExp(pattern + '$');
}

/**
 * Creates a SegmentMatcher from a list of tokens.
 */
export function createSegmentMatcher(
  tokens: SegmentToken[],
  child: TrieNode,
  registry: WildcardRegistry
): SegmentMatcher {
  const captureNames = tokens
    .filter((t): t is Extract<SegmentToken, { type: 'wildcard' }> => t.type === 'wildcard')
    .map((t) => t.name);

  const cachedRegex = buildSegmentRegex(tokens, registry);

  return {
    tokens,
    captureNames,
    cachedRegex,
    child,
    getRegex() {
      return this.cachedRegex ?? buildFreshRegex(this.tokens, registry);
    },
  };
}

/**
 * Escapes special regex characters in a literal string.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Recursively builds the trie from a RouteConfig node.
 */
function buildNode(
  config: RouteConfig,
  node: TrieNode,
  registry: WildcardRegistry,
  warnings: string[]
): void {
  for (const [key, value] of Object.entries(config)) {
    const isPureLiteral = !key.includes('{{');

    if (isPureLiteral) {
      if (!node.literals.has(key)) {
        node.literals.set(key, createTrieNode());
      }
      const child = node.literals.get(key)!;

      if (isRouteLeaf(value)) {
        child.leaf = value;
      } else {
        buildNode(value, child, registry, warnings);
      }
    } else {
      const tokens = parseSegmentKey(key, registry);
      const child = createTrieNode();
      const matcher = createSegmentMatcher(tokens, child, registry);

      node.matchers.push(matcher);

      if (isRouteLeaf(value)) {
        child.leaf = value;
      } else {
        buildNode(value, child, registry, warnings);
      }
    }
  }
}

/**
 * Recursively walks the trie to match a parsed query.
 * Literals are checked before matchers — first match wins among matchers.
 */
function matchNode(
  node: TrieNode,
  segments: string[],
  captures: Record<string, string>
): TrieMatch | null {
  if (segments.length === 0) {
    return node.leaf ? { leaf: node.leaf, captures } : null;
  }

  const [head, ...tail] = segments;

  if (node.literals.has(head)) {
    const result = matchNode(node.literals.get(head)!, tail, captures);
    if (result) return result;
  }

  for (const matcher of node.matchers) {
    const match = matcher.getRegex().exec(head);

    if (match) {
      const newCaptures = { ...captures };
      matcher.captureNames.forEach((name, i) => {
        newCaptures[name] = match[i + 1];
      });

      const result = matchNode(matcher.child, tail, newCaptures);
      if (result) return result;
    }
  }

  return null;
}

// #endregion

// #region Trie Class

export class Trie {
  private root: TrieNode = createTrieNode();

  /**
   * Compiles a RouteConfig into the internal trie structure.
   * Runs validation via trie-validator before finalising.
   * Should be called once at config load and again on config reload.
   *
   * @param config - The user's route configuration
   * @param registry - The fully built wildcard registry
   */
  build(config: RouteConfig, registry: WildcardRegistry): void {
    const warnings: string[] = [];
    this.root = createTrieNode();
    buildNode(config, this.root, registry, warnings);
    validateTrie(this.root, warnings);

    if (warnings.length > 0) {
      warnings.forEach((w) => console.warn(`[path-scout] ${w}`));
    }
  }

  /**
   * Walks the trie to find a matching route for a p

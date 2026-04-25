import type { ParsedQuery } from './types/query.types.js';
import type { TrieMatch, PatternToken, ITrieNode, IBaseTrieNode, TrieRootNode } from './types/trie.types.js';
import type { ActionDefinition } from './types/action.types.js';
import type { RouteConfig, RouteNode } from './types/route.types.js';
import { isResolvableRouteNode } from './types/route.types.js';
import { WildcardRegistry } from './wildcard-registry.js';
import { parseSegmentKey, compileSegmentPattern } from './utils/segment-parser.js';

/**
 * A single wildcard capture collected during trie traversal.
 * Name is the wildcard's name without index — normalization handles indexing.
 */
type CapturedWildcard = {
  name: string;
  value: string;
};

/**
 * The result of a successful trie match.
 * Holds raw captured wildcards internally and exposes normalized captures via getCapturedWildcards().
 */
class TrieMatchResult implements TrieMatch {
  /** The action to invoke */
  readonly action: ActionDefinition;
  /**
   * The raw args from the matched node, before interpolation.
   * References like {{env}} are not yet resolved.
   * @example { instance: '{{env}}', table: '{{sn:table}}', filter: 'active=true' }
   */
  readonly args: Record<string, string>;
  /**
   * Raw captured wildcards collected during traversal.
   * Not indexed — normalization is deferred to getCapturedWildcards().
   */
  private readonly _capturedWildcards: CapturedWildcard[];

  constructor(
    action: ActionDefinition,
    args: Record<string, string>,
    capturedWildcards: CapturedWildcard[]
  ) {
    this.action = action;
    this.args = args;
    this._capturedWildcards = capturedWildcards;
  }

  /**
   * Returns normalized captured wildcard values.
   * Single occurrence wildcards are returned without index e.g. "word".
   * Multiple occurrence wildcards are returned with zero-based index e.g. "word[0]", "word[1]".
   */
  getCapturedWildcards(): Record<string, string> {
    return normalizeCapturedWildcards(this._capturedWildcards);
  }
}

/**
 * A single node in the trie representing one level of a path.
 * Caches the compiled regex pattern after first compilation.
 * compiledPattern is private — always access the pattern via getPattern().
 */
class TrieNode implements ITrieNode {
  /** Original segment key string used for deduplication during build */
  readonly _key: string;
  /**
   * Ordered list of tokens defining what this node matches against.
   * A single LiteralPatternToken uses strict equality.
   * Any other combination compiles to a regex.
   */
  readonly pattern: PatternToken[];
  /** Child nodes evaluated in declaration order — first match wins */
  children: TrieNode[] = [];
  /** The action to invoke when a query terminates at this node */
  action?: ActionDefinition;
  /**
   * Maps action parameter names to captured wildcard names or static values.
   * Required when action is present.
   * @example { env: '{{env}}', table: '{{sn:table}}', filter: 'active=true' }
   */
  args?: Record<string, string>;
  /**
   * The pre-compiled regex pattern for this node's pattern tokens.
   * Null when any wildcard in the pattern has recompileOnMatch set to true —
   * getPattern() will build fresh each time in that case.
   */
  private readonly compiledPattern: RegExp | null;

  constructor(key: string, pattern: PatternToken[]) {
    this._key = key;
    this.pattern = pattern;
    // Skip caching when any wildcard requires recompilation on every match.
    const needsRecompile = pattern.some(
      t => t.type === 'wildcard' && t.wildcard.recompileOnMatch
    );
    this.compiledPattern = needsRecompile ? null : compileSegmentPattern(this.pattern);
  }

  /**
   * Returns the compiled regex pattern for this node's pattern tokens.
   * Returns compiledPattern if available, otherwise builds fresh.
   * Fresh builds occur when any wildcard in the pattern has recompileOnMatch set to true.
   */
  getPattern(): RegExp {
    if (this.compiledPattern) return this.compiledPattern;
    return compileSegmentPattern(this.pattern);
  }
}

export class Trie {
  /** The root node of the trie, entry point for all matches */
  private root: TrieRootNode = createRootNode();

  /**
   * Compiles a RouteConfig into the internal trie structure.
   * Should be called once at config load and again on config reload.
   *
   * @param config - The user's route configuration
   * @param registry - The fully built wildcard registry
   */
  build(config: RouteConfig, registry: WildcardRegistry): void {
    this.root = createRootNode();
    buildNode(config, this.root, registry);
  }

  /**
   * Walks the trie to find a matching route for a parsed query.
   * Returns a TrieMatchResult containing the matched action, args,
   * and normalized captured wildcard values, or null if no match is found.
   *
   * @param query - The parsed query segments from parseQuery()
   */
  match(query: ParsedQuery): TrieMatch | null {
    return matchNode(this.root, query, []);
  }
}

/**
 * Normalizes an array of captured wildcards into a record.
 * Wildcards appearing only once are stored without index.
 * Wildcards appearing more than once are stored with zero-based indexes.
 *
 * @param capturedWildcards - The raw array of captured wildcards
 * @returns A normalized record of wildcard names to matched values
 *
 * @example
 * // Single occurrence
 * [{ name: 'word', value: 'dev' }] → { word: 'dev' }
 *
 * @example
 * // Multiple occurrences
 * [{ name: 'word', value: 'dev' }, { name: 'word', value: 'prod' }]
 * → { 'word[0]': 'dev', 'word[1]': 'prod' }
 */
function normalizeCapturedWildcards(
  capturedWildcards: CapturedWildcard[]
): Record<string, string> {
  const counts: Record<string, number> = {};
  for (const { name } of capturedWildcards) {
    counts[name] = (counts[name] ?? 0) + 1;
  }

  const indexes: Record<string, number> = {};
  const result: Record<string, string> = {};

  for (const { name, value } of capturedWildcards) {
    if (counts[name] === 1) {
      result[name] = value;
    } else {
      const index = indexes[name] ?? 0;
      result[`${name}[${index}]`] = value;
      indexes[name] = index + 1;
    }
  }

  return result;
}

/**
 * Creates an empty trie root node.
 */
function createRootNode(): TrieRootNode {
  return { children: [] };
}

/**
 * Finds an existing child node matching the segment key or creates a new one.
 * Preserves declaration order — new children are appended to the end.
 *
 * @param node - The parent node to search in
 * @param key - The original segment key string
 * @param pattern - The compiled pattern tokens for the new node if created
 */
function findOrCreateChild(
  node: IBaseTrieNode,
  key: string,
  pattern: PatternToken[]
): TrieNode {
  const existing = node.children.find((child) => child._key === key);
  if (existing) return existing as TrieNode;

  const child = new TrieNode(key, pattern);
  node.children.push(child);
  return child;
}

/**
 * Recursively builds the trie from a RouteConfig or RouteNode.
 * Skips _action and _args keys — these are metadata on the node, not child segments.
 * A node can be resolvable and have children simultaneously.
 *
 * @param config - The route config or node to build from
 * @param node - The current trie node to build into
 * @param registry - The wildcard registry to resolve wildcard references against
 */
function buildNode(
  config: RouteConfig | RouteNode,
  node: IBaseTrieNode,
  registry: WildcardRegistry
): void {
  for (const [key, value] of Object.entries(config)) {
    if (key === '_action' || key === '_args') continue;

    const routeNode = value as RouteNode;
    const tokens = parseSegmentKey(key, registry);
    const child = findOrCreateChild(node, key, tokens);

    if (isResolvableRouteNode(routeNode)) {
      child.action = routeNode._action;
      child.args = routeNode._args;
    }

    buildNode(routeNode, child, registry);
  }
}

/**
 * Checks whether a node's pattern matches a segment string.
 * A single literal token uses strict equality.
 * Any other combination uses the node's cached regex.
 *
 * @param node - The trie node whose pattern to match against
 * @param segment - The decoded segment string to match
 */
function matchesPattern(node: TrieNode, segment: string): boolean {
  if (node.pattern.length === 1 && node.pattern[0].type === 'literal') {
    return node.pattern[0].value === segment;
  }

  return node.getPattern().test(segment);
}

/**
 * Extracts wildcard captures from a matched segment.
 * Returns an array of raw captures without indexes —
 * normalization is deferred to getCapturedWildcards().
 *
 * @param node - The matched trie node
 * @param segment - The matched segment string
 */
function extractCaptures(
  node: TrieNode,
  segment: string
): CapturedWildcard[] {
  if (node.pattern.length === 1 && node.pattern[0].type === 'literal') {
    return [];
  }

  const capturedWildcards: CapturedWildcard[] = [];
  const match = node.getPattern().exec(segment);

  if (match) {
    let groupIndex = 1;
    for (const token of node.pattern) {
      if (token.type === 'wildcard') {
        capturedWildcards.push({ name: token.wildcard.name, value: match[groupIndex++] });
      }
    }
  }

  return capturedWildcards;
}

/**
 * Recursively walks the trie to match a parsed query.
 * Children are evaluated in declaration order — first match wins.
 * Captures are accumulated across all segments and normalized at the end.
 *
 * @param node - The current trie node to match from
 * @param segments - The remaining query segments to match
 * @param captured - Wildcard captures collected so far during traversal
 */
function matchNode(
  node: IBaseTrieNode,
  segments: string[],
  captured: CapturedWildcard[]
): TrieMatch | null {
  if (segments.length === 0) {
    if (node.action && node.args) {
      return new TrieMatchResult(node.action, node.args, captured);
    }
    return null;
  }

  const [head, ...tail] = segments;

  for (const child of node.children) {
    const trieChild = child as TrieNode;

    if (matchesPattern(trieChild, head)) {
      const newCaptures = [
        ...captured,
        ...extractCaptures(trieChild, head),
      ];

      const result = matchNode(trieChild, tail, newCaptures);
      if (result) return result;
    }
  }

  return null;
}

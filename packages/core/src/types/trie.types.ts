import type { IRegisteredWildcard } from './wildcard.types.js';
import type { ActionDefinition } from './action.types.js';

/**
 * A literal string token within a segment pattern.
 * When a pattern consists of a single LiteralPatternToken,
 * matching uses strict equality instead of regex.
 */
export interface LiteralPatternToken {
  type: 'literal';
  /** The exact string value to match against */
  value: string;
}

/**
 * A wildcard token within a segment pattern.
 * The wildcard object contains the name, description, and pattern
 * used to validate the segment at match time.
 */
export interface WildcardPatternToken {
  type: 'wildcard';
  /** The registered wildcard used to match and capture this token */
  wildcard: IRegisteredWildcard;
}

/**
 * A single unit within a compiled segment pattern.
 * Mixed segments compile into an ordered list of tokens.
 */
export type PatternToken = LiteralPatternToken | WildcardPatternToken;

/**
 * Base fields shared by all trie nodes.
 * Extended by ITrieNode and TrieRootNode.
 */
export interface IBaseTrieNode {
  /** Child nodes evaluated in declaration order — first match wins */
  children: ITrieNode[];
  /** Present when a route terminates or passes through this node */
  action?: ActionDefinition;
  /**
   * Maps action parameter names to captured wildcard names or static values.
   * Required when action is present.
   * @example { env: '{{env}}', table: '{{sn:table}}', filter: 'active=true' }
   */
  args?: Record<string, string>;
}

/**
 * Contract for a single node in the trie representing one level of a path.
 * Implemented by the TrieNode class in trie.ts.
 * Action and args may be present on both intermediate and terminal nodes —
 * an intermediate node with action and args will execute when the query
 * terminates at that level, even if longer routes continue from it.
 * Terminal nodes (no children) must have action and args.
 */
export interface ITrieNode extends IBaseTrieNode {
  /** Original segment key string used for deduplication during build */
  readonly _key: string;
  /**
   * Ordered list of tokens defining what this node matches against.
   * A single LiteralPatternToken uses strict equality.
   * Any other combination compiles to a regex.
   */
  readonly pattern: PatternToken[];
  /**
   * Returns the compiled regex pattern for this node's pattern tokens.
   * Returns compiledPattern if available, otherwise builds fresh.
   * Fresh builds occur when any wildcard in the pattern has recompileOnMatch set to true.
   */
  getPattern(): RegExp;
}

/**
 * The root node of the trie. Has no pattern since it is purely an entry point
 * into the trie whose children are evaluated against the first path segment.
 */
export interface TrieRootNode extends IBaseTrieNode {}

/**
 * The result of a successful trie match.
 * Contains the matched action and args, and exposes normalized captured
 * wildcard values via getCapturedWildcards().
 * Implemented by TrieMatchResult in trie.ts.
 */
export interface TrieMatch {
  /** The action to invoke */
  readonly action: ActionDefinition;
  /**
   * The raw args from the matched node, before interpolation.
   * References like {{env}} are not yet resolved.
   * @example { instance: '{{env}}', table: '{{sn:table}}', filter: 'active=true' }
   */
  readonly args: Record<string, string>;
  /**
   * Returns normalized captured wildcard values collected during trie traversal.
   * Single occurrence wildcards are returned without index e.g. "word".
   * Multiple occurrence wildcards are returned with zero-based index e.g. "word[0]", "word[1]".
   */
  getCapturedWildcards(): Record<string, string>;
}

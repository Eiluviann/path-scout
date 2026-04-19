import { IRegisteredWildcard } from './wildcard.types.js';
import { ActionDefinition } from './action.types.js';

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
 * A single node in the trie representing one level of a path.
 * Each node matches one segment via its pattern and points to child nodes.
 * Action and args may be present on both intermediate and terminal nodes —
 * an intermediate node with action and args will execute when the query
 * terminates at that level, even if longer routes continue from it.
 * Terminal nodes (no children) must have action and args.
 */
export interface TrieNode {
  /**
   * Ordered list of tokens defining what this node matches against.
   * A single LiteralPatternToken uses strict equality.
   * Any other combination compiles to a regex.
   */
  pattern: PatternToken[];
  /** Child nodes evaluated in declaration order — first match wins */
  children: TrieNode[];
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
 * The root node of the trie. Identical to TrieNode but without a pattern —
 * the root has no segment to match against, it is purely an entry point
 * into the trie whose children are evaluated against the first path segment.
 */
export interface TrieRootNode extends Omit<TrieNode, 'pattern'> {}

/**
 * The result of a successful trie match.
 * Contains everything needed to interpolate args and invoke the action.
 */
export interface TrieMatch {
  /** The action to invoke */
  action: ActionDefinition;
  /**
   * The raw args from the matched node, before interpolation.
   * References like {{env}} are not yet resolved.
   * @example { instance: '{{env}}', table: '{{sn:table}}', filter: 'active=true' }
   */
  args: Record<string, string>;
  /**
   * Wildcard values collected during trie traversal.
   * Keys are wildcard names, values are the matched segments.
   * @example { env: 'dev', 'sn:table': 'sc_req_item' }
   */
  capturedWildcards: Record<string, string>;
}

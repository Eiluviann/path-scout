// Types
export type { Query, ParsedQuery } from './types/query.types.js';
export type { ActionDefinition } from './types/action.types.js';
export type { Plugin } from './types/plugin.types.js';
export type {
  Wildcard,
  IRegisteredWildcard,
  StaticWildcard,
  DynamicWildcard,
} from './types/wildcard.types.js';
export { isStaticWildcard, isDynamicWildcard } from './types/wildcard.types.js';
export type {
  LiteralPatternToken,
  WildcardPatternToken,
  PatternToken,
  IBaseTrieNode,
  ITrieNode,
  TrieRootNode,
  TrieMatch,
} from './types/trie.types.js';
export type { RouteConfig, RouteNode } from './types/route.types.js';
export { isResolvableRouteNode } from './types/route.types.js';
export type { PathScoutConfig } from './types/config.types.js';
export { defineConfig } from './types/config.types.js';

// Errors
export {
  PathScoutError,
  CollisionError,
  NamespaceCollisionError,
  ValidationError,
  UnknownWildcardError,
} from './errors.js';

// Core
export { WildcardRegistry, RegisteredWildcard } from './wildcard-registry.js';
export { Trie } from './trie.js';
export { ConfigLoader } from './config-loader.js';
export { parseQuery } from './parser.js';
export { interpolate } from './interpolation.js';

// Utils
export { parseSegmentKey, compileSegmentPattern } from './utils/segment-parser.js';
export { escapeRegex } from './utils/regex.js';

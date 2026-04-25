// Types

export { ConfigLoader } from './config-loader.js';
// Errors
export {
  CollisionError,
  NamespaceCollisionError,
  PathScoutError,
  UnknownWildcardError,
  ValidationError,
} from './errors.js';
export { interpolate } from './interpolation.js';
export { parseQuery } from './parser.js';
export { Trie } from './trie.js';
export type { ActionDefinition } from './types/action.types.js';
export type { PathScoutConfig } from './types/config.types.js';
export { defineConfig } from './types/config.types.js';
export type { Plugin } from './types/plugin.types.js';
export type { ParsedQuery, Query } from './types/query.types.js';
export type { RouteConfig, RouteNode } from './types/route.types.js';
export { isResolvableRouteNode } from './types/route.types.js';
export type {
  IBaseTrieNode,
  ITrieNode,
  LiteralPatternToken,
  PatternToken,
  TrieMatch,
  TrieRootNode,
  WildcardPatternToken,
} from './types/trie.types.js';
export type {
  DynamicWildcard,
  IRegisteredWildcard,
  StaticWildcard,
  Wildcard,
} from './types/wildcard.types.js';
export { isDynamicWildcard, isStaticWildcard } from './types/wildcard.types.js';
export { escapeRegex } from './utils/regex.js';

// Utils
export { compileSegmentPattern, parseSegmentKey } from './utils/segment-parser.js';
// Core
export { RegisteredWildcard, WildcardRegistry } from './wildcard-registry.js';

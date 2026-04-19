/**
 * Base error class for all Path Scout errors.
 * All errors thrown by the core extend this class,
 * allowing the CLI to catch and format them consistently.
 */
export class PathScoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when two plugins share the same namespace.
 * This is a fatal error at config load.
 */
export class NamespaceCollisionError extends PathScoutError {}

/**
 * Thrown when a plugin wildcard name collides with a core wildcard name.
 * This is a fatal error at config load.
 */
export class CollisionError extends PathScoutError {}

/**
 * Thrown when a wildcard's validate function or list rejects its own example value.
 * This is a fatal error at config load.
 */
export class ValidationError extends PathScoutError {}

/**
 * Thrown when a route references a wildcard that is not present in the registry.
 * This is a fatal error at config load.
 */
export class UnknownWildcardError extends PathScoutError {}

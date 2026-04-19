import { Wildcard, PluginDefinition } from './types.js';
import {
  CollisionError,
  NamespaceCollisionError,
  UnknownWildcardError,
  ValidationError,
} from './errors.js';

/**
 * Internal representation of a registered wildcard.
 * Extends Wildcard with a compiled regex pattern for efficient matching.
 * compiledPattern is null when recompileOnMatch is true — patternFn is called on every match instead.
 */
type RegisteredWildcard = Wildcard & {
  compiledPattern: RegExp | null;
};

/**
 * Registry of all wildcards available for use in route path segments.
 * Built once at config load — core wildcards are pre-loaded in the constructor,
 * plugin wildcards are registered via registerPlugin.
 */
export class WildcardRegistry {
  private wildcards: Map<string, RegisteredWildcard> = new Map();
  private namespaces: string[] = [];

  constructor() {
    this.register({
      name: '*',
      description: 'Matches any non-empty segment with no validation',
      example: 'anything',
      pattern: /.+/,
    });

    this.register({
      name: 'word',
      description: 'Matches any non-empty string containing no spaces',
      example: 'hello',
      pattern: /\S+/,
    });
  }

  /**
   * Registers a core wildcard into the registry.
   * Compiles the pattern or patternFn result and stores it alongside the wildcard.
   * Throws CollisionError if a wildcard with the same name already exists.
   */
  register(wildcard: Wildcard): void {
    if (this.wildcards.has(wildcard.name)) {
      throw new CollisionError(
        `Wildcard "{{${wildcard.name}}}" is already registered as a core wildcard. ` +
        `Core wildcard names are reserved and cannot be overridden.`
      );
    }

    this.wildcards.set(wildcard.name, {
      ...wildcard,
      compiledPattern: this.compile(wildcard),
    });
  }

  /**
   * Registers all wildcards contributed by a plugin.
   * Automatically prefixes each wildcard name with the plugin namespace.
   * Throws NamespaceCollisionError if the plugin namespace is already registered.
   */
  registerPlugin(plugin: PluginDefinition): void {
    if (this.namespaces.includes(plugin.namespace)) {
      throw new NamespaceCollisionError(
        `Plugin namespace "${plugin.namespace}" is already registered. ` +
        `Each plugin must have a unique namespace.`
      );
    }

    this.namespaces.push(plugin.namespace);

    for (const wildcard of plugin.wildcards ?? []) {
      const fullName = `${plugin.namespace}:${wildcard.name}`;
      this.wildcards.set(fullName, {
        ...wildcard,
        name: fullName,
        compiledPattern: this.compile(wildcard),
      });
    }
  }

  /**
   * Smoke-tests every registered wildcard's compiled pattern against its own example value.
   * Collects all failures and throws a single ValidationError listing them all.
   * Should be called after all plugins are registered and before the trie is compiled.
   */
  validate(): void {
    const failures: string[] = [];

    for (const [name, wildcard] of this.wildcards) {
      try {
        const pattern = wildcard.compiledPattern ?? this.resolvePattern(wildcard);
        const valid = new RegExp(`^(?:${pattern.source})$`).test(wildcard.example);

        if (!valid) {
          failures.push(
            `Wildcard "{{${name}}}" rejected its own example value "${wildcard.example}". ` +
            `Check the pattern definition.`
          );
        }
      } catch (error) {
        failures.push(
          `Wildcard "{{${name}}}" threw an unexpected error while validating its own example value "${wildcard.example}": ` +
          `${error instanceof Error ? error.message : String(error)}.`
        );
      }
    }

    if (failures.length > 0) {
      throw new ValidationError(
        `Wildcard validation failed:\n${failures.map(f => `  - ${f}`).join('\n')}`
      );
    }
  }

  /**
   * Looks up a wildcard by its full reference name.
   * Throws UnknownWildcardError if no wildcard with that name exists.
   * @param name - Full reference name e.g. "word", "servicenow:env"
   */
  resolve(name: string): RegisteredWildcard {
    const wildcard = this.wildcards.get(name);

    if (!wildcard) {
      throw new UnknownWildcardError(
        `Route references "{{${name}}}" but no wildcard with that name exists in the registry. ` +
        `Did you forget to register the plugin that contributes this wildcard?`
      );
    }

    return wildcard;
  }

  /**
   * Returns the compiled pattern for a wildcard.
   * For recompileOnMatch wildcards, calls patternFn fresh each time.
   * For all others, returns the pre-compiled pattern.
   * @param wildcard - The registered wildcard to get the pattern for
   */
  getPattern(wildcard: RegisteredWildcard): RegExp {
    return wildcard.compiledPattern ?? this.resolvePattern(wildcard);
  }

  /**
   * Compiles a wildcard's pattern at registration time.
   * Returns null for dynamic wildcards with recompileOnMatch set to true.
   */
  private compile(wildcard: Wildcard): RegExp | null {
    if ('pattern' in wildcard && wildcard.pattern) {
      return wildcard.pattern;
    }

    if ('patternFn' in wildcard && wildcard.patternFn) {
      if (wildcard.recompileOnMatch) return null;
      return wildcard.patternFn();
    }

    return null;
  }

  /**
   * Calls patternFn to resolve a fresh pattern.
   * Only used for dynamic wildcards with recompileOnMatch set to true.
   */
  private resolvePattern(wildcard: Wildcard): RegExp {
    if ('patternFn' in wildcard && wildcard.patternFn) {
      return wildcard.patternFn();
    }

    throw new ValidationError(
      `Wildcard "{{${wildcard.name}}}" has no pattern or patternFn defined.`
    );
  }
}

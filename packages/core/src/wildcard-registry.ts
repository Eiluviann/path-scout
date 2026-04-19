import {
  Wildcard,
  IRegisteredWildcard,
  isStaticWildcard,
  isDynamicWildcard,
} from './types/wildcard.types.js';
import { PluginDefinition } from './types/plugin.types.js';
import {
  CollisionError,
  NamespaceCollisionError,
  UnknownWildcardError,
  ValidationError,
} from './errors.js';

/**
 * Internal representation of a registered wildcard.
 * Wraps a Wildcard definition with a compiled pattern and getPattern method.
 * compiledPattern is private — always access the pattern via getPattern().
 */
export class RegisteredWildcard implements IRegisteredWildcard {
  readonly name: string;
  readonly description: string;
  readonly examples?: string[];
  readonly recompileOnMatch?: boolean;
  private readonly compiledPattern: RegExp | null;
  private readonly source: Wildcard;

  constructor(wildcard: Wildcard) {
    this.name = wildcard.name;
    this.description = wildcard.description;
    this.examples = wildcard.examples;
    this.recompileOnMatch = 'recompileOnMatch' in wildcard ? wildcard.recompileOnMatch : undefined;
    this.source = wildcard;
    this.compiledPattern = this.compile();
  }

  /**
   * Returns the regex pattern for this wildcard.
   * For recompileOnMatch wildcards, calls patternFn fresh each time.
   * For all others, returns the pre-compiled pattern.
   */
  getPattern(): RegExp {
    if (this.compiledPattern !== null) {
      return this.compiledPattern;
    }

    if (isDynamicWildcard(this.source)) {
      return this.source.patternFn();
    }

    throw new ValidationError(
      `Wildcard "${this.name}" has no pattern or patternFn defined.`
    );
  }

  /**
   * Compiles the wildcard pattern at construction time.
   * Returns null for recompileOnMatch wildcards — patternFn is called on every match instead.
   */
  private compile(): RegExp | null {
    if (isStaticWildcard(this.source)) {
      return this.source.pattern;
    }

    if (isDynamicWildcard(this.source)) {
      if (this.source.recompileOnMatch) return null;
      return this.source.patternFn();
    }

    return null;
  }
}

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
      examples: ['anything', 'hello', '123', 'test 123 !@#'],
      pattern: /.+/,
    });

    this.register({
      name: 'word',
      description: 'Matches any non-empty string containing no spaces',
      examples: ['hello', 'world', 'foo'],
      pattern: /\S+/,
    });
  }

  /**
   * Registers a core wildcard into the registry.
   * Throws CollisionError if a wildcard with the same name already exists.
   */
  register(wildcard: Wildcard): void {
    if (this.wildcards.has(wildcard.name)) {
      throw new CollisionError(
        `Wildcard "{{${wildcard.name}}}" is already registered as a core wildcard. ` +
        `Core wildcard names are reserved and cannot be overridden.`
      );
    }

    this.wildcards.set(wildcard.name, new RegisteredWildcard(wildcard));
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
      this.wildcards.set(
        fullName,
        new RegisteredWildcard({ ...wildcard, name: fullName })
      );
    }
  }

  /**
   * Smoke-tests every registered wildcard's pattern against its own example values.
   * Collects all failures and throws a single ValidationError listing them all.
   * Should be called after all plugins are registered and before the trie is compiled.
   */
  validate(): void {
    const failures: string[] = [];

    for (const [name, wildcard] of this.wildcards) {
      if (!wildcard.examples?.length) continue;

      for (const example of wildcard.examples) {
        try {
          const pattern = wildcard.getPattern();
          const valid = new RegExp(`^(?:${pattern.source})$`).test(example);

          if (!valid) {
            failures.push(
              `Wildcard "{{${name}}}" rejected example value "${example}". ` +
              `Check the pattern definition.`
            );
          }
        } catch (error) {
          failures.push(
            `Wildcard "{{${name}}}" threw an unexpected error while validating example value "${example}": ` +
            `${error instanceof Error ? error.message : String(error)}.`
          );
        }
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
}

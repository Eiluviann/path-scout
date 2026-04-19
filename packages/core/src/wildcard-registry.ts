import { Wildcard, PluginDefinition } from './types.js';
import {
  CollisionError,
  NamespaceCollisionError,
  UnknownWildcardError,
  ValidationError,
} from './errors.js';

/**
 * Registry of all wildcards available for use in route path segments.
 * Built once at config load — core wildcards are pre-loaded in the constructor,
 * plugin wildcards are registered via registerPlugin.
 */
export class WildcardRegistry {
  private wildcards: Map<string, Wildcard> = new Map();
  private namespaces: string[] = [];

  constructor() {
    this.register({
      name: '*',
      description: 'Matches any non-empty segment with no validation',
      example: 'anything',
      validate: (segment) => segment.length > 0,
    });

    this.register({
      name: 'word',
      description: 'Matches any non-empty string containing no spaces',
      example: 'hello',
      validate: (segment) => segment.length > 0 && !segment.includes(' '),
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

    this.wildcards.set(wildcard.name, wildcard);
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
      this.wildcards.set(fullName, { ...wildcard, name: fullName });
    }
  }

  /**
   * Smoke-tests every registered wildcard's validate against its own example value.
   * Collects all failures and throws a single ValidationError listing them all.
   * Should be called after all plugins are registered and before the trie is compiled.
   */
  validate(): void {
    const failures: string[] = [];

    for (const [name, wildcard] of this.wildcards) {
      try {
        const valid = Array.isArray(wildcard.validate)
          ? wildcard.validate.includes(wildcard.example)
          : wildcard.validate(wildcard.example);

        if (!valid) {
          failures.push(
            `Wildcard "{{${name}}}" rejected its own example value "${wildcard.example}". ` +
            `Check the validate definition.`
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
  resolve(name: string): Wildcard {
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

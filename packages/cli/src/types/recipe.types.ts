/**
 * Defines a recipe — a curated bundle of plugins and a config template.
 * Currently owned by the CLI for built-in recipes.
 * In future, plugins will export their own recipes which the CLI discovers.
 */
export interface Recipe {
  /** Display name shown in recipe list */
  name: string;
  /** Description shown in recipe list */
  description: string;
  /** npm package names to install when applying this recipe */
  plugins: string[];
  /**
   * Interactive wizard that collects values needed to generate the config.
   * Uses @clack/prompts for the UI.
   * @returns A record of named values collected from the user
   */
  prompt(): Promise<Record<string, string>>;
  /**
   * Generates the config file content from wizard values.
   * @param values - The values collected by prompt()
   * @returns A string containing the full path-scout.config.ts content
   */
  generateConfig(values: Record<string, string>): string;
}

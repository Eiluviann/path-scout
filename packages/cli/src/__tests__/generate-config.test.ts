import { describe, expect, it } from 'vitest';
import { servicenowRecipe } from '../commands/recipe/recipes/servicenow.js';

describe('servicenowRecipe.generateConfig', () => {
  const baseValues = {
    envs: JSON.stringify({
      dev: { url: 'myinstance-dev', portal: 'sp' },
      prod: { url: 'myinstance', portal: 'sp' },
    }),
    aliases: JSON.stringify({
      ritm: 'sc_req_item',
      catit: 'sc_cat_item',
    }),
  };

  it('generates a valid TypeScript config file', () => {
    const config = servicenowRecipe.generateConfig(baseValues);
    expect(config).toContain("import { defineConfig } from 'path-scout'");
    expect(config).toContain("import { ServiceNowPlugin } from '@path-scout/plugin-servicenow'");
  });

  it('includes configured environments', () => {
    const config = servicenowRecipe.generateConfig(baseValues);
    expect(config).toContain("dev: { url: 'myinstance-dev', portal: 'sp' }");
    expect(config).toContain("prod: { url: 'myinstance', portal: 'sp' }");
  });

  it('includes configured aliases', () => {
    const config = servicenowRecipe.generateConfig(baseValues);
    expect(config).toContain("ritm: 'sc_req_item'");
    expect(config).toContain("catit: 'sc_cat_item'");
  });

  it('includes default filters', () => {
    const config = servicenowRecipe.generateConfig(baseValues);
    expect(config).toContain("active: 'active=true'");
    expect(config).toContain("mine: 'assigned_to=javascript:getMyAssignmentsFilter()'");
  });

  it('includes defineConfig wrapper', () => {
    const config = servicenowRecipe.generateConfig(baseValues);
    expect(config).toContain('export default defineConfig(');
  });

  it('includes plugin in config', () => {
    const config = servicenowRecipe.generateConfig(baseValues);
    expect(config).toContain('plugins: [sn]');
  });

  it('includes core routes', () => {
    const config = servicenowRecipe.generateConfig(baseValues);
    expect(config).toContain('_action: sn.openInstance');
    expect(config).toContain('_action: sn.openTableList');
    expect(config).toContain('_action: sn.searchTableByQuery');
  });
});

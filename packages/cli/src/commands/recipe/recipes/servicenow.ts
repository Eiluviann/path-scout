import * as p from '@clack/prompts';
import type { Recipe } from '../../../types/recipe.types.js';

export const servicenowRecipe: Recipe = {
  name: 'ServiceNow',
  description: 'Navigate ServiceNow instances — tables, records, portals and more',
  plugins: ['@path-scout/plugin-servicenow'],

  async prompt() {
    const values: Record<string, string> = {};

    // Collect environments
    const envs: Array<{ alias: string; url: string; portal: string }> = [];

    p.log.step('Configure your ServiceNow environments');

    while (true) {
      const alias = await p.text({
        message: 'Environment alias',
        placeholder: 'dev',
        validate: (v) => {
          if (!v) return 'Alias is required';
          if (envs.find((e) => e.alias === v)) return 'Alias already exists';
        },
      });

      if (p.isCancel(alias)) {
        p.cancel('Setup cancelled');
        process.exit(0);
      }

      const url = await p.text({
        message: 'URL subdomain',
        placeholder: 'myinstance-dev',
        validate: (v) => {
          if (!v) return 'URL subdomain is required';
        },
      });

      if (p.isCancel(url)) {
        p.cancel('Setup cancelled');
        process.exit(0);
      }

      const portal = await p.text({
        message: 'Service Portal suffix',
        placeholder: 'sp',
        defaultValue: 'sp',
      });

      if (p.isCancel(portal)) {
        p.cancel('Setup cancelled');
        process.exit(0);
      }

      envs.push({ alias: alias as string, url: url as string, portal: portal as string });

      const another = await p.confirm({
        message: 'Add another environment?',
        initialValue: false,
      });

      if (p.isCancel(another) || !another) break;
    }

    // Collect table aliases
    const aliases = await p.multiselect({
      message: 'Which table aliases would you like?',
      options: [
        { value: 'ritm:sc_req_item', label: 'ritm → sc_req_item' },
        { value: 'catit:sc_cat_item', label: 'catit → sc_cat_item' },
        { value: 'ordguide:sc_cat_item_guide', label: 'ordguide → sc_cat_item_guide' },
        { value: 'uds:sys_update_set', label: 'uds → sys_update_set' },
        { value: 'udsxml:sys_update_xml', label: 'udsxml → sys_update_xml' },
        { value: 'si:sys_script_include', label: 'si → sys_script_include' },
        { value: 'wgt:sp_widget', label: 'wgt → sp_widget' },
        { value: 'pg:sp_page', label: 'pg → sp_page' },
      ],
      initialValues: ['ritm:sc_req_item', 'catit:sc_cat_item', 'ordguide:sc_cat_item_guide', 'uds:sys_update_set'],
    });

    if (p.isCancel(aliases)) {
      p.cancel('Setup cancelled');
      process.exit(0);
    }

    values.envs = JSON.stringify(Object.fromEntries(envs.map(({ alias, url, portal }) => [alias, { url, portal }])));

    values.aliases = JSON.stringify(
      Object.fromEntries(
        (aliases as string[]).map((a) => {
          const [key, value] = a.split(':');
          return [key, value];
        })
      )
    );

    return values;
  },

  generateConfig(values) {
    const envs = JSON.parse(values.envs) as Record<string, { url: string; portal: string }>;
    const aliases = JSON.parse(values.aliases) as Record<string, string>;

    const envsStr = Object.entries(envs)
      .map(([alias, { url, portal }]) => `    ${alias}: { url: '${url}', portal: '${portal}' },`)
      .join('\n');

    const aliasesStr = Object.entries(aliases)
      .map(([alias, table]) => `    ${alias}: '${table}',`)
      .join('\n');

    return `import { defineConfig } from 'path-scout';
import { ServiceNowPlugin } from '@path-scout/plugin-servicenow';

const sn = new ServiceNowPlugin({
  envs: {
${envsStr}
  },
  aliases: {
${aliasesStr}
  },
  filters: {
    active: 'active=true',
    mine: 'assigned_to=javascript:getMyAssignmentsFilter()',
  },
});

export default defineConfig({
  port: 7000,
  plugins: [sn],
  routes: {
    "{{sn:env}}": {
      _action: sn.openInstance,
      _args: { env: '{{sn:env}}' },
      'login': {
        _action: sn.instanceLogin,
        _args: { env: '{{sn:env}}' },
      },
      'imp': {
        '{{sn:env}}': {
          _action: sn.openRemoteInstance,
          _args: { env: '{{sn:env[0]}}', targetEnv: '{{sn:env[1]}}' },
        },
      },
      'bg': {
        _action: sn.openBackgroundScript,
        _args: { env: '{{sn:env}}' },
      },
      'cuds': {
        _action: sn.openCurrentUpdateSet,
        _args: { env: '{{sn:env}}' },
      },
      'p.config': {
        _action: sn.openPortalRecord,
        _args: { env: '{{sn:env}}' },
      },
      'p': {
        _action: sn.openPortal,
        _args: { env: '{{sn:env}}' },
        'catit#{{sn:sys_id}}': {
          _action: sn.openCatalogItemOnPortal,
          _args: { env: '{{sn:env}}', sys_id: '{{sn:sys_id}}' },
        },
        'ordguide#{{sn:sys_id}}': {
          _action: sn.openOrderGuideOnPortal,
          _args: { env: '{{sn:env}}', sys_id: '{{sn:sys_id}}' },
        },
        '{{word}}': {
          _action: sn.openPortalPage,
          _args: { env: '{{sn:env}}', word: '{{word}}' },
        },
      },
      '{{sn:table}}.new': {
        _action: sn.openNewRecordForm,
        _args: { env: '{{sn:env}}', table: '{{sn:table}}' },
      },
      '{{sn:table}}.form': {
        _action: sn.openRecordForm,
        _args: { env: '{{sn:env}}', table: '{{sn:table}}' },
      },
      '{{sn:table}}.config': {
        _action: sn.openTableConfig,
        _args: { env: '{{sn:env}}', table: '{{sn:table}}' },
      },
      '{{sn:table}} {{*}}': {
        _action: sn.searchTable,
        _args: { env: '{{sn:env}}', table: '{{sn:table}}', text: '{{*}}' },
      },
      '{{sn:table}}?{{*}}': {
        _action: sn.searchTableByQuery,
        _args: { env: '{{sn:env}}', table: '{{sn:table}}', query: '{{*}}' },
      },
      '{{sn:table}}#{{sn:sys_id}}': {
        _action: sn.openRecordById,
        _args: { env: '{{sn:env}}', table: '{{sn:table}}', sys_id: '{{sn:sys_id}}' },
      },
      '{{sn:table}}': {
        _action: sn.openTableList,
        _args: { env: '{{sn:env}}', table: '{{sn:table}}' },
        '{{sn:filter}}': {
          _action: sn.searchTableByFilter,
          _args: { env: '{{sn:env}}', table: '{{sn:table}}', filter: '{{sn:filter}}' },
        },
      },
    },
  },
});
`;
  },
};

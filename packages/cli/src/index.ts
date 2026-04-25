#!/usr/bin/env node
export { defineConfig } from '@path-scout/core';

import { defineCommand, runMain } from 'citty';
import pkg from '../package.json' with { type: 'json' };
import { add } from './commands/add.js';
import { init } from './commands/init.js';
import { recipe } from './commands/recipe/index.js';
import { remove } from './commands/remove.js';
import { restart } from './commands/restart.js';
import { start } from './commands/start.js';
import { status } from './commands/status.js';
import { stop } from './commands/stop.js';

const main = defineCommand({
  meta: {
    name: 'path-scout',
    version: pkg.version,
    description: 'A blazing fast browser bookmark redirector',
  },
  subCommands: {
    start,
    stop,
    restart,
    add,
    remove,
    init,
    status,
    recipe,
  },
});

runMain(main);

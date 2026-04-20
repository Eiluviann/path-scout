import { defineCommand, runMain } from 'citty';
import { start } from './commands/start.js';
import { stop } from './commands/stop.js';
import { restart } from './commands/restart.js';
import { add } from './commands/add.js';
import { remove } from './commands/remove.js';
import { init } from './commands/init.js';
import { status } from './commands/status.js';
import { recipe } from './commands/recipe/index.js';

const main = defineCommand({
  meta: {
    name: 'path-scout',
    version: '0.0.1',
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

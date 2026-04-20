import { execSync } from 'node:child_process';

/**
 * Resolves the path to the pnpm executable.
 * Passes the current process PATH to ensure version managers are respected.
 */
export function getPnpmPath(): string {
  try {
    return execSync('which pnpm', {
      encoding: 'utf-8',
      env: { ...process.env, PATH: process.env.PATH },
    }).trim();
  } catch {
    return 'pnpm';
  }
}

/**
 * Runs a pnpm command with the current process environment.
 *
 * @param command - The pnpm command to run
 */
export function runPnpm(command: string): void {
  const pnpmPath = getPnpmPath();
  execSync(`"${pnpmPath}" ${command}`, {
    stdio: 'inherit',
    env: { ...process.env },
  });
}

import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SERVICE_NAME = 'path-scout';
const SERVICE_PATH = join(homedir(), '.config/systemd/user', `${SERVICE_NAME}.service`);

/**
 * Generates the systemd unit file for the path-scout service.
 *
 * @param execPath - Absolute path to the path-scout executable
 * @param port - Port the server should run on
 */
function generateUnit(execPath: string): string {
  return `[Unit]
Description=path-scout bookmark server
After=network.target

[Service]
ExecStart=${execPath} start
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
`;
}

/**
 * Installs and starts path-scout as a systemd user service.
 *
 * @param execPath - Absolute path to the path-scout executable
 * @param port - Port the server should run on
 */
export function systemdInstall(execPath: string): void {
  writeFileSync(SERVICE_PATH, generateUnit(execPath), 'utf-8');
  execSync('systemctl --user daemon-reload');
  execSync(`systemctl --user enable ${SERVICE_NAME}`);
  execSync(`systemctl --user start ${SERVICE_NAME}`);
}

/**
 * Stops the systemd user service.
 */
export function systemdStop(): void {
  execSync(`systemctl --user stop ${SERVICE_NAME}`);
}

/**
 * Restarts the systemd user service.
 */
export function systemdRestart(): void {
  execSync(`systemctl --user restart ${SERVICE_NAME}`);
}

/**
 * Returns true if the systemd service unit file exists.
 */
export function systemdIsInstalled(): boolean {
  return existsSync(SERVICE_PATH);
}

/**
 * Stops, disables and removes the systemd service unit file.
 */
export function systemdUninstall(): void {
  systemdStop();
  execSync(`systemctl --user disable ${SERVICE_NAME}`);
  if (existsSync(SERVICE_PATH)) {
    rmSync(SERVICE_PATH);
  }
}

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PLIST_LABEL = 'com.path-scout.server';
const PLIST_PATH = join(
  homedir(),
  'Library/LaunchAgents',
  `${PLIST_LABEL}.plist`
);

/**
 * Generates the launchd plist XML for the path-scout service.
 *
 * @param execPath - Absolute path to the path-scout executable
 * @param port - Port the server should run on
 */
function generatePlist(execPath: string): string {
  const home = homedir();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${execPath}</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${home}/.config/path-scout/logs/stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${home}/.config/path-scout/logs/stderr.log</string>
</dict>
</plist>`;
}

/**
 * Installs and starts path-scout as a launchd service.
 *
 * @param execPath - Absolute path to the path-scout executable
 * @param port - Port the server should run on
 */
export function launchdInstall(execPath: string): void {
  writeFileSync(PLIST_PATH, generatePlist(execPath), 'utf-8');
  execSync(`launchctl load ${PLIST_PATH}`);
}

/**
 * Stops and unloads the launchd service.
 */
export function launchdStop(): void {
  if (!existsSync(PLIST_PATH)) return;
  execSync(`launchctl unload ${PLIST_PATH}`);
}

/**
 * Restarts the launchd service.
 */
export function launchdRestart(): void {
  launchdStop();
  execSync(`launchctl load ${PLIST_PATH}`);
}

/**
 * Returns true if the launchd service plist exists.
 */
export function launchdIsInstalled(): boolean {
  return existsSync(PLIST_PATH);
}

/**
 * Removes the plist file and unloads the service.
 */
export function launchdUninstall(): void {
  launchdStop();
  if (existsSync(PLIST_PATH)) {
    rmSync(PLIST_PATH);
  }
}

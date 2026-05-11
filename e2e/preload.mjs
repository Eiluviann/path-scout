// Preload for PTY-driven e2e tests.  Injected via --import.
//
// Problem 1 — zero-width PTY:
//   expect's default spawn creates a PTY that reports columns=0, causing
//   @clack/prompts to wrap every character onto its own line.  This breaks
//   the pattern strings used in interact.exp ("Confirm", "table aliases", …).
//   Fix: shadow process.stdout.columns with 120 so @clack renders normally.
//
// Problem 2 — stale Symbol(keypress-decoder) after readline.Interface.close():
//   readline.Interface.close() pauses stdin and leaves a stale
//   Symbol(keypress-decoder) on it.  The next readline.createInterface() call
//   triggers emitKeypressEvents(stdin), which returns early because the symbol
//   is still set — no fresh handler is installed for the new prompt.
//   Fix: patch readline.Interface.prototype.close to delete the stale symbol
//   and explicitly resume stdin, giving the next prompt a clean slate.
//   (Patching named exports is forbidden on ESM module namespaces, but
//    prototype methods are ordinary writable properties and can be replaced.)

import * as readline from 'node:readline';

// ── Fix 1: stable column width ──────────────────────────────────────────────
// Shadow the C++-backed columns property so @clack uses 120 instead of 0.
Object.defineProperty(process.stdout, 'columns', {
  get: () => 120,
  configurable: true,
});

// ── Fix 2: stale keypress-decoder ───────────────────────────────────────────
const _close = readline.Interface.prototype.close;

readline.Interface.prototype.close = function () {
  _close.call(this);
  const s = this.input;
  if (!s || !this.terminal) return;

  // Delete the stale keypress-decoder symbol so the next Interface's
  // emitKeypressEvents() call runs fully and installs a fresh decoder.
  const sym = Object.getOwnPropertySymbols(s).find(
    (x) => x.description === 'keypress-decoder',
  );
  if (sym) delete s[sym];
  // Do NOT resume here — readline.createInterface resumes stdin automatically
  // for the next prompt, and if this is the final close the process needs
  // stdin to remain paused so the event loop can drain and the process exits.
};

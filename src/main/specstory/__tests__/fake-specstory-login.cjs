#!/usr/bin/env node
/**
 * A stand-in for `specstory login`, matching the real CLI's observed
 * behaviour byte-for-byte where it matters (bundled 2.8.0, captured by feeding
 * it a bad code on a pipe):
 *
 *  - it announces that it is opening the browser, ONCE per process;
 *  - it prompts, then blocks on a line-read of stdin;
 *  - a bad code prints "❌ Authentication failed: …" and it prompts AGAIN
 *    rather than exiting (five attempts);
 *  - a good code writes $HOME/.specstory/cli/auth.json and exits 0.
 *
 * Used by login.test.ts so the child-lifetime rules can be tested
 * without a network, a browser, or anybody's real SpecStory account.
 */

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const GOOD = process.env['FAKE_GOOD_CODE'] ?? 'GOOD01';

process.stdout.write('\n🌐 Opening your browser to log in to SpecStory Cloud...\n');
if (process.env['FAKE_BROWSER_MARKER'] !== undefined) {
  fs.appendFileSync(process.env['FAKE_BROWSER_MARKER'], 'opened\n');
}
process.stdout.write('📋 If your browser didn’t open, please visit:\n');

const rl = readline.createInterface({ input: process.stdin });
process.stdout.write(
  "🔑 Enter the 6-character code shown in your browser (or 'quit' to cancel):\n   Code: "
);

rl.on('line', (line) => {
  const code = line.trim();
  if (code === GOOD) {
    const dir = path.join(process.env['HOME'] ?? '', '.specstory', 'cli');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'auth.json'),
      JSON.stringify({
        cloud_refresh: {
          token: 'fake-refresh',
          as: 'scratch@example.test',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          lastValidAt: new Date().toISOString()
        }
      }),
      { mode: 0o600 }
    );
    process.stdout.write('\n✅ Successfully logged in!\n');
    process.exit(0);
  }
  process.stdout.write(
    '\n❌ Authentication failed: Invalid or expired device code\n\nPlease try entering the code again.\n'
  );
  process.stdout.write(
    "🔑 Enter the 6-character code shown in your browser (or 'quit' to cancel):\n   Code: "
  );
});

rl.on('close', () => {
  process.stderr.write('Failed to read authentication code: EOF.\n');
  process.exit(1);
});

// Checks the built package from both module systems; runs on every Node version in engines.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const esm = await import('date-shortcut-parser');
const cjs = require('date-shortcut-parser');

for (const { DateShortcutParser } of [esm, cjs]) {
  const parser = new DateShortcutParser({ fromDate: new Date('2024-05-15T10:00:00Z') });
  assert.equal(parser.parse('+1d 5pm').toISOString(), '2024-05-16T17:00:00.000Z');
  const tr = new DateShortcutParser({ fromDate: new Date('2024-05-15T10:00:00Z'), locale: 'tr' });
  assert.equal(tr.parse('+1YIL').toISOString(), '2025-05-15T00:00:00.000Z');
}

console.log(`smoke test passed on Node ${process.version}`);

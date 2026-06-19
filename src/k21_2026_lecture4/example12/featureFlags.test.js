import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseFeatureFlags } from './featureFlags.js';

test('parses boolean feature flags', () => {
  assert.deepEqual(parseFeatureFlags('search=true, beta=false'), {
    beta: false,
    search: true,
  });
});

test('trims keys and values', () => {
  assert.deepEqual(parseFeatureFlags(' search = true '), { search: true });
});

test('rejects invalid input', () => {
  assert.throws(() => parseFeatureFlags('search=yes'), /true or false/);
  assert.throws(() => parseFeatureFlags('=true'), /key/);
  assert.throws(() => parseFeatureFlags(''), /empty/);
});

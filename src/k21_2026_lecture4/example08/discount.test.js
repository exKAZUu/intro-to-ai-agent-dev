import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyDiscount } from './discount.js';

test('applies a percentage discount', () => {
  assert.equal(applyDiscount(1000, 20), 800);
});

test('rejects invalid percentages', () => {
  assert.throws(() => applyDiscount(1000, -1), /percent/);
  assert.throws(() => applyDiscount(1000, 100), /percent/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateSignup } from './validator.js';

test('normalizes valid signup data', () => {
  assert.deepEqual(validateSignup({ name: '  Alice ', email: 'ALICE@EXAMPLE.COM' }), {
    name: 'Alice',
    email: 'alice@example.com',
  });
});

test('rejects invalid data', () => {
  assert.throws(() => validateSignup({ name: '', email: 'a@example.com' }), /name/);
  assert.throws(() => validateSignup({ name: 'Alice', email: 'alice' }), /email/);
});

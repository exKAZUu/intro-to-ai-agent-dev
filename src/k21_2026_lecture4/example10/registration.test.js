import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeRegistration } from './registration.js';

test('normalizes a valid registration', () => {
  assert.deepEqual(normalizeRegistration({ name: '  Alice  ', email: 'ALICE@EXAMPLE.COM' }), {
    name: 'Alice',
    email: 'alice@example.com',
  });
});

test('rejects incomplete registrations', () => {
  assert.throws(() => normalizeRegistration({ name: '', email: 'a@example.com' }), /name/);
  assert.throws(() => normalizeRegistration({ name: 'Alice', email: '' }), /email/);
});

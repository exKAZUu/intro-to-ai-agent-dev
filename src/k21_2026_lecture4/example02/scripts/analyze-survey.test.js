import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summarizeSurvey } from './analyze-survey.js';

test('calculates average satisfaction', () => {
  assert.equal(
    summarizeSurvey(`
name,satisfaction
Alice,5
Bob,3
Carol,4
Dave,2
Eve,5
    `.trim()).averageSatisfaction,
    3.8
  );
});

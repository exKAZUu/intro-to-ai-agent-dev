/**
 * outputSchemaを使い、Codexのリポジトリ分析結果をプログラムで扱えるJSONとして受け取る例。
 */

import { Codex } from '@openai/codex-sdk';

import { displayFinalResponse, displayItemSummary, parseJson } from './helpers.js';

const LectureMappingSchema = {
  type: 'object',
  properties: {
    lecture3Theme: { type: 'string' },
    lecture4Theme: { type: 'string' },
    matchingConcepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lecture3Concept: { type: 'string' },
          codexEquivalent: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['lecture3Concept', 'codexEquivalent', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['lecture3Theme', 'lecture4Theme', 'matchingConcepts'],
  additionalProperties: false,
} as const;

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(
  `
src/k21_2026_lecture3 の流れを読み、lecture4でCodex SDKに対応させる学習概念をJSONで整理してください。
ファイルは変更しないでください。
`.trim(),
  { outputSchema: LectureMappingSchema }
);

displayFinalResponse('JSON文字列', turn.finalResponse);
displayItemSummary(turn.items);
console.log('\n=== matchingConcepts 件数 ===');
console.log(parseJson<{ matchingConcepts: unknown[] }>(turn.finalResponse).matchingConcepts.length);

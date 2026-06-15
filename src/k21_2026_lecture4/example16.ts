/**
 * Codex SDKで講義4全体の構成レビューを行い、構造化された最終レポートを作る総合例。
 */

import { Codex } from '@openai/codex-sdk';

import { displayFinalResponse, displayItemSummary, parseJson } from './helpers.js';

const ReportSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    progression: { type: 'array', items: { type: 'string' }, minItems: 4 },
    codexSpecificStrengths: { type: 'array', items: { type: 'string' }, minItems: 3 },
    risks: { type: 'array', items: { type: 'string' }, minItems: 2 },
    verificationPoints: { type: 'array', items: { type: 'string' }, minItems: 3 },
    nextActions: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
  },
  required: ['title', 'progression', 'codexSpecificStrengths', 'risks', 'verificationPoints', 'nextActions'],
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
src/k21_2026_lecture3 と src/k21_2026_lecture4 を確認し、lecture4 が lecture3 の概念をCodex SDKでどう発展させているかをレビューしてください。
progression は講義の流れ、verificationPoints は各例で観察すべき item や出力確認を書いてください。
ファイルは変更しないでください。
`.trim(),
  { outputSchema: ReportSchema }
);

displayFinalResponse('講義4総合レビュー(JSON)', turn.finalResponse);
displayItemSummary(turn.items);
console.log('\nverificationPoints 件数:', parseJson<{ verificationPoints: unknown[] }>(turn.finalResponse).verificationPoints.length);

/**
 * Codex SDKで講義4全体の構成レビューを行い、構造化された最終レポートを作る総合例。
 */

import { Codex } from '@openai/codex-sdk';

const ReportSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    progression: { type: 'array', items: { type: 'string' }, minItems: 4 },
    codexSpecificStrengths: { type: 'array', items: { type: 'string' }, minItems: 3 },
    risks: { type: 'array', items: { type: 'string' }, minItems: 2 },
    nextActions: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
  },
  required: ['title', 'progression', 'codexSpecificStrengths', 'risks', 'nextActions'],
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
ファイルは変更しないでください。
`.trim(),
  { outputSchema: ReportSchema }
);

console.log('\n=== 講義4総合レビュー(JSON) ===\n');
console.log(turn.finalResponse);

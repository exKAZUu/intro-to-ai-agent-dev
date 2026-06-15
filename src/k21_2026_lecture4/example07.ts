/**
 * Codexのコード実行結果をoutputSchemaで構造化し、lecture3のstructured output相当を実現する例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { displayCommandExecutions, displayFileChanges, displayFinalResponse, displayItemSummary, parseJson } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-structured-'));
await writeFile(
  join(workspace, 'survey.csv'),
  `
name,attendance_type,satisfaction,hardest_topic,hands_on_completed,request
Alice,対面,5,tools,完了,実用例を増やしたい
Bob,オンライン,3,MCP,未完了,接続手順を詳しく知りたい
Carol,対面,4,MCP,完了,Excel連携を試したい
Dave,録画,2,guardrails,未完了,失敗例があると理解しやすい
Eve,対面,5,tools,完了,業務に近い題材がよい
`.trim()
);

const SurveySchema = {
  type: 'object',
  properties: {
    averageScore: { type: 'number' },
    handsOnCompletionRate: { type: 'number' },
    hardestTopics: { type: 'array', items: { type: 'string' } },
    improvementActions: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
  },
  required: ['averageScore', 'handsOnCompletionRate', 'hardestTopics', 'improvementActions'],
  additionalProperties: false,
} as const;

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(
  `
survey.csv をスクリプトで分析し、平均満足度、ハンズオン完了率、最頻出の難所、改善アクション3つをJSONだけで返してください。
平均満足度とハンズオン完了率は、必ず作成したスクリプトの計算結果を使ってください。
`.trim(),
  { outputSchema: SurveySchema }
);

displayFinalResponse('JSON文字列', turn.finalResponse);
displayItemSummary(turn.items);
displayFileChanges(turn.items);
displayCommandExecutions(turn.items);
const parsed = parseJson<{ averageScore: number; handsOnCompletionRate: number }>(turn.finalResponse);
console.log('\n平均満足度:', parsed.averageScore);
console.log('ハンズオン完了率:', parsed.handsOnCompletionRate);

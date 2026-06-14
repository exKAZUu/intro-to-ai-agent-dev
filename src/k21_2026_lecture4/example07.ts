/**
 * Codexのコード実行結果をoutputSchemaで構造化し、lecture3のstructured output相当を実現する例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-structured-'));
await writeFile(
  join(workspace, 'survey.csv'),
  `
name,satisfaction,hardest_topic
Alice,5,tools
Bob,3,MCP
Carol,4,MCP
Dave,2,guardrails
Eve,5,tools
`.trim()
);

const SurveySchema = {
  type: 'object',
  properties: {
    averageScore: { type: 'number' },
    hardestTopics: { type: 'array', items: { type: 'string' } },
    improvementActions: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
  },
  required: ['averageScore', 'hardestTopics', 'improvementActions'],
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
survey.csv をスクリプトで分析し、平均満足度、最頻出の難所、改善アクション3つをJSONだけで返してください。
`.trim(),
  { outputSchema: SurveySchema }
);

console.log('\n=== JSON文字列 ===\n');
console.log(turn.finalResponse);
console.log('\n平均満足度:', parseCodexJson(turn.finalResponse).averageScore);

function parseCodexJson(json: string): { averageScore: number } {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error(`CodexのJSON出力を解析できませんでした: ${error}`);
  }
}

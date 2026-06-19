/**
 * Agents SDKのstructured output相当を、Codex SDKのoutputSchemaで置き換える例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayJson, displayThreadInfo, displayWorkspace, parseJson } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-structured-triage-'));
await writeFile(
  join(workspace, 'requests.json'),
  JSON.stringify(
    [
      { id: 'r1', text: 'toolsとMCPの違いを演習前にもう一度説明してほしい' },
      { id: 'r2', text: 'Codex SDKでファイルを編集するときの安全な権限設定を知りたい' },
      { id: 'r3', text: '第3回のアンケート集計を次回改善案につなげたい' },
    ],
    null,
    2
  )
);

const TriageSchema = {
  type: 'object',
  properties: {
    requests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string', enum: ['concept', 'safety', 'analysis'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          owner: { type: 'string' },
          reply: { type: 'string' },
        },
        required: ['id', 'category', 'priority', 'owner', 'reply'],
        additionalProperties: false,
      },
    },
  },
  required: ['requests'],
  additionalProperties: false,
} as const;

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(
  `
requests.json を読み、各相談を講義運営で扱いやすいJSONに分類してください。
owner は teacher, ta, curriculum のいずれかにしてください。
ファイルは変更しないでください。
`.trim(),
  { outputSchema: TriageSchema }
);

const parsed = parseJson<{ requests: unknown[] }>(turn.finalResponse);
displayWorkspace(workspace);
displayFinalResponse('JSON文字列', turn.finalResponse);
displayJson('パース後の分類結果', parsed.requests);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);

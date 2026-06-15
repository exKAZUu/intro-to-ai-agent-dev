/**
 * Codexに一時ワークスペースのファイルを編集させ、コードベース操作の基本を確認する例。
 */

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { displayFileChanges, displayFinalResponse, displayItemSummary } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-edit-'));
const planPath = join(workspace, 'lecture_plan.md');
await writeFile(
  planPath,
  `
# 第3回講義案

- tools
- MCP
- guardrails
`.trim()
);

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
lecture_plan.md を編集し、各題材に23分の演習時間と1文の学習目標を追加してください。
90分講義の残り時間で導入と振り返りができるように、最後に合計演習時間も追記してください。
`.trim());

console.log('\nWorkspace:', workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
console.log('\n=== 編集後のファイル ===\n');
console.log(await readFile(planPath, 'utf8'));
displayItemSummary(turn.items);
displayFileChanges(turn.items);

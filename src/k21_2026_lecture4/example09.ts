/**
 * Codexに一時ワークスペースのファイルを編集させ、コードベース操作の基本を確認する例。
 */

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

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
`.trim());

console.log('\nWorkspace:', workspace);
console.log('\n=== Codexの回答 ===\n');
console.log(turn.finalResponse);
console.log('\n=== 編集後のファイル ===\n');
console.log(await readFile(planPath, 'utf8'));
console.log('\nfile changes:', turn.items.filter((item) => item.type === 'file_change').length);

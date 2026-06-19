/**
 * workspace-write sandboxでファイル編集を許可し、file_changeを観察する例。
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import { displayFileChanges, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWorkspace } from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-workspace-write-'));
const planPath = join(workspace, 'lecture_plan.md');
await writeFile(
  planPath,
  `
# 第4回講義案

- Codex SDKを紹介する
- ファイル編集を見せる
  `.trim()
);
await execFileAsync('git', ['init'], { cwd: workspace });
await execFileAsync('git', ['add', 'lecture_plan.md'], { cwd: workspace });

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
lecture_plan.md を編集し、前半は「Agents SDKの代替」、後半は「Codex SDKでしか作りにくい開発ワークフロー」という構成が分かるようにしてください。
箇条書きには各項目の学習目標も追加してください。
編集後に git diff -- lecture_plan.md で差分を確認してください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
console.log('\n=== 編集後のlecture_plan.md ===\n');
console.log(await readFile(planPath, 'utf8'));
displayItemSummary(turn.items);
displayFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);

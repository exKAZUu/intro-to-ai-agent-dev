/**
 * resumeThreadを使い、中断した開発作業を同じ文脈で再開する例。
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  displayCommandExecutions,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-resume-workflow-'));
await writeFile(
  join(workspace, 'task.md'),
  `
# Task

Create a script named summary.js.
It should print {"topic":"Codex SDK","phase":"resume","ready":true}.
`.trim()
);
await execFileAsync('git', ['init'], { cwd: workspace });

const codex = new Codex();
const firstThread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const plan = await firstThread.run(`
task.md を読み、実装計画を2点で作ってください。
まだファイルは作成しないでください。
`.trim());

if (!firstThread.id) {
  throw new Error('Codex thread IDを取得できませんでした。');
}

const resumedThread = codex.resumeThread(firstThread.id, {
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const implementation = await resumedThread.run(`
先ほどの計画に基づき summary.js を作成してください。
MISE_CACHE_DIR=$PWD/.mise-cache node summary.js を実行し、JSONが出力されることを確認してください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('計画', plan.finalResponse);
displayItemSummary(plan.items);
displayFinalResponse('resume後の実装', implementation.finalResponse);
displayItemSummary(implementation.items);
displayFileChanges(implementation.items);
displayCommandExecutions(implementation.items);
displayThreadInfo(resumedThread.id, implementation.usage);
console.log('\n=== summary.js ===\n');
console.log(await readFile(join(workspace, 'summary.js'), 'utf8'));

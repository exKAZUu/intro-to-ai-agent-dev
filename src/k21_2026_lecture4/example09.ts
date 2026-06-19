/**
 * read-only sandboxでコードレビューだけを許可し、ファイル変更を防ぐ例。
 */

import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWorkspace } from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-readonly-review-'));
await writeFile(
  join(workspace, 'report.js'),
  `
export function completionRate(completed, total) {
  return completed / total;
}

export function formatRate(rate) {
  return Math.round(rate) + "%";
}
`.trim()
);
await execFileAsync('git', ['init'], { cwd: workspace });

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
report.js をレビューし、実務でバグになりそうな点を最大3件で指摘してください。
修正案は文章で提案するだけにし、ファイルは絶対に変更しないでください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('レビュー結果', turn.finalResponse);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);

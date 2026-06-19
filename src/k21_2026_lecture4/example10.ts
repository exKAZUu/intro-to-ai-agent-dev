/**
 * read-only sandboxでコードレビューだけを許可し、ファイル変更を防ぐ例。
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, createExampleWorkspace, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWorkspace } from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await createExampleWorkspace('example10', 'k21-codex-readonly-review-');
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

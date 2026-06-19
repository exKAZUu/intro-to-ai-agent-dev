/**
 * 実装担当threadとレビュー担当threadを分け、レビュー結果を実装担当へ戻す例。
 */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  assertNoFileChanges,
  createCodexEnv,
  createExampleWorkspace,
  displayCommandExecutions,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await createExampleWorkspace('example11', 'k21-codex-implement-review-');
const filePath = join(workspace, 'featureFlags.js');
await execFileAsync('git', ['init'], { cwd: workspace });

const codex = new Codex({ env: createCodexEnv(workspace) });
const implementer = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const implementation = await implementer.run(`
featureFlags.md を読み、featureFlags.js の parseFeatureFlags を仕様に合わせて修正してください。
まずは featureFlags.js の変更だけを行い、テスト実行はレビュー後に行います。
`.trim());

const reviewer = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const review = await reviewer.run(`
featureFlags.js と featureFlags.test.js を読み、実装担当の成果物をレビューしてください。
特に boolean 変換、空入力、キーの欠落、テスト未実行のリスクを確認してください。
修正案は文章で提案するだけにし、ファイルは絶対に変更しないでください。
`.trim());

const fix = await implementer.run(`
レビュー担当から次の指摘がありました。

${review.finalResponse}

指摘を踏まえて featureFlags.js を修正し、node --test featureFlags.test.js を実行してください。
失敗した場合は再修正し、同じコマンドでテストが通ることを確認してください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('実装担当 初回', implementation.finalResponse);
displayItemSummary(implementation.items);
displayFileChanges(implementation.items);
displayFinalResponse('レビュー担当', review.finalResponse);
displayItemSummary(review.items);
assertNoFileChanges(review.items);
displayFinalResponse('実装担当 修正後', fix.finalResponse);
displayItemSummary(fix.items);
displayFileChanges(fix.items);
displayCommandExecutions(fix.items);
displayThreadInfo(implementer.id, fix.usage);
displayThreadInfo(reviewer.id, review.usage);
console.log('\n=== featureFlags.js ===\n');
console.log(await readFile(filePath, 'utf8'));

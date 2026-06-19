/**
 * 実装担当threadとレビュー担当threadを分け、レビュー結果を実装担当へ戻す例。
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  assertNoFileChanges,
  createCodexEnv,
  displayCommandExecutions,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-implement-review-'));
const filePath = join(workspace, 'featureFlags.js');
await writeFile(join(workspace, 'package.json'), '{"type":"module"}');
await writeFile(
  filePath,
  `
export function parseFeatureFlags(text) {
  return Object.fromEntries(text.split(',').map((entry) => entry.split('=')));
}
`.trim()
);
await writeFile(
  join(workspace, 'featureFlags.md'),
  `
# Feature flag parser

Implement parseFeatureFlags(text).
Input is a comma-separated list such as "search=true, beta=false".
Keys should be trimmed strings.
Values must be "true" or "false" and should become booleans.
Empty entries and invalid values should throw clear errors.
`.trim()
);
await writeFile(
  join(workspace, 'featureFlags.test.js'),
  `
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseFeatureFlags } from './featureFlags.js';

test('parses boolean feature flags', () => {
  assert.deepEqual(parseFeatureFlags('search=true, beta=false'), {
    beta: false,
    search: true,
  });
});

test('trims keys and values', () => {
  assert.deepEqual(parseFeatureFlags(' search = true '), { search: true });
});

test('rejects invalid input', () => {
  assert.throws(() => parseFeatureFlags('search=yes'), /true or false/);
  assert.throws(() => parseFeatureFlags('=true'), /key/);
  assert.throws(() => parseFeatureFlags(''), /empty/);
});
`.trim()
);
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

/**
 * 実装担当threadとレビュー担当threadを分け、sandbox権限で役割分担する例。
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  assertNoFileChanges,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-implement-review-'));
const filePath = join(workspace, 'metrics.js');
await writeFile(
  filePath,
  `
export function average(scores) {
  return 0;
}
`.trim()
);
await execFileAsync('git', ['init'], { cwd: workspace });

const codex = new Codex();
const implementer = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const implementation = await implementer.run(`
metrics.js の average(scores) を実装してください。
空配列なら0を返し、それ以外は平均値を返してください。
実装後に MISE_CACHE_DIR=$PWD/.mise-cache node -e "import('./metrics.js').then(({average}) => console.log(average([5,3,4,2,5])))" を実行し、3.8が出ることを確認してください。
`.trim());

const reviewer = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const review = await reviewer.run(`
metrics.js を読み、実装担当の成果物をレビューしてください。
空配列、数値以外の入力、検証コマンドの観点で短く評価してください。
ファイルは変更しないでください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('実装担当', implementation.finalResponse);
displayItemSummary(implementation.items);
displayFileChanges(implementation.items);
displayFinalResponse('レビュー担当', review.finalResponse);
displayItemSummary(review.items);
assertNoFileChanges(review.items);
displayThreadInfo(implementer.id, implementation.usage);
displayThreadInfo(reviewer.id, review.usage);
console.log('\n=== metrics.js ===\n');
console.log(await readFile(filePath, 'utf8'));

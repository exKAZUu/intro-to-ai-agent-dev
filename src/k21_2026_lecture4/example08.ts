/**
 * バグ修正と検証コマンド実行をCodexに任せる例。
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  createCodexEnv,
  displayCommandExecutions,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-fix-verify-'));
const scriptPath = join(workspace, 'discount.js');
await writeFile(join(workspace, 'package.json'), '{"type":"module"}');
await writeFile(
  scriptPath,
  `
export function applyDiscount(price, percent) {
  return price * percent;
}
`.trim()
);
await writeFile(
  join(workspace, 'discount.test.js'),
  `
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyDiscount } from './discount.js';

test('applies a percentage discount', () => {
  assert.equal(applyDiscount(1000, 20), 800);
});

test('rejects invalid percentages', () => {
  assert.throws(() => applyDiscount(1000, -1), /percent/);
  assert.throws(() => applyDiscount(1000, 100), /percent/);
});
`.trim()
);
await execFileAsync('git', ['init'], { cwd: workspace });

const codex = new Codex({ env: createCodexEnv(workspace) });
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
discount.js には割引後価格を計算するバグがあります。
node --test discount.test.js を実行して失敗を確認し、discount.js を修正してください。
修正後に同じテストコマンドを再実行し、すべて通ることを確認してください。
修正理由、確認したコマンド、確認結果を最終回答にも含めてください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
console.log('\n=== 修正後のdiscount.js ===\n');
console.log(await readFile(scriptPath, 'utf8'));
displayItemSummary(turn.items);
displayFileChanges(turn.items);
displayCommandExecutions(turn.items);
displayThreadInfo(thread.id, turn.usage);

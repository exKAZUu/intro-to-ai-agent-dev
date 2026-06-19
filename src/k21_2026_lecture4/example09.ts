/**
 * バグ修正と検証コマンド実行をCodexに任せる例。
 */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  assertCommandSucceeded,
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
const workspace = await createExampleWorkspace('example09', 'k21-codex-fix-verify-');
const scriptPath = join(workspace, 'discount.js');
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
assertCommandSucceeded(turn.items, 'node --test discount.test.js', { minCount: 2 });
displayThreadInfo(thread.id, turn.usage);

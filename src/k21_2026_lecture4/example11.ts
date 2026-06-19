/**
 * 1つのCodex threadで、調査、計画、実装、検証を段階的に進める例。
 */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  assertNoCommandMatching,
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
const workspace = await createExampleWorkspace('example11', 'k21-codex-staged-workflow-');
await execFileAsync('git', ['init'], { cwd: workspace });

const codex = new Codex({ env: createCodexEnv(workspace) });
const investigationThread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

displayWorkspace(workspace);

const investigation = await investigationThread.run(`
README.md と registration.test.js を読み、必要な実装作業を2点で整理してください。
このturnではファイルを変更できない read-only sandbox で調査だけを行っています。
`.trim());
displayFinalResponse('調査', investigation.finalResponse);
displayItemSummary(investigation.items);
assertNoFileChanges(investigation.items);

if (!investigationThread.id) {
  throw new Error('Codex thread IDを取得できませんでした。');
}

const thread = codex.resumeThread(investigationThread.id, {
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const implementation = await thread.run(`
調査結果に基づき registration.js を作成してください。
実行確認は次のturnで行うので、このturnでは実装だけをしてください。
`.trim());
displayFinalResponse('実装', implementation.finalResponse);
displayItemSummary(implementation.items);
displayFileChanges(implementation.items);
displayCommandExecutions(implementation.items);
assertNoCommandMatching(implementation.items, 'node --test registration.test.js');

const verification = await thread.run(`
node --test registration.test.js を実行し、すべてのテストが通ることを確認してください。
失敗した場合は registration.js を修正し、同じコマンドで再検証してください。
確認したコマンドと結果を回答に含めてください。
`.trim());
displayFinalResponse('検証', verification.finalResponse);
displayItemSummary(verification.items);
displayFileChanges(verification.items);
displayCommandExecutions(verification.items);
displayThreadInfo(thread.id, verification.usage);
console.log('\n=== registration.js ===\n');
console.log(await readFile(join(workspace, 'registration.js'), 'utf8'));

/**
 * 1つのCodex threadで、調査、計画、実装、検証を段階的に進める例。
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
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-staged-workflow-'));
await writeFile(
  join(workspace, 'README.md'),
  `
# Survey report tool

Create a small script that reports average satisfaction and completion rate.
`.trim()
);
await execFileAsync('git', ['init'], { cwd: workspace });

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

displayWorkspace(workspace);

const investigation = await thread.run('README.md を読み、必要な実装作業を2点で整理してください。');
displayFinalResponse('調査', investigation.finalResponse);
displayItemSummary(investigation.items);

const implementation = await thread.run(`
調査結果に基づき report.js を作成してください。
満足度 [5,3,4,2,5] の平均、完了数3/5、完了率をJSONで出力するスクリプトにしてください。
実行確認は次のturnで行うので、このturnでは report.js の作成だけをしてください。
`.trim());
displayFinalResponse('実装', implementation.finalResponse);
displayItemSummary(implementation.items);
displayFileChanges(implementation.items);

const verification = await thread.run(`
MISE_CACHE_DIR=$PWD/.mise-cache node report.js を実行し、JSONが出力されることを確認してください。
平均満足度が3.8であることも確認し、確認したコマンドと結果を回答に含めてください。
`.trim());
displayFinalResponse('検証', verification.finalResponse);
displayItemSummary(verification.items);
displayCommandExecutions(verification.items);
displayThreadInfo(thread.id, verification.usage);
console.log('\n=== report.js ===\n');
console.log(await readFile(join(workspace, 'report.js'), 'utf8'));

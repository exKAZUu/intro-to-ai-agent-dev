/**
 * Codexにバグ修正と検証コマンド実行を任せ、書く・試す・直す開発ループを体験する例。
 */

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { displayCommandExecutions, displayFileChanges, displayFinalResponse, displayItemSummary } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-fix-'));
const scriptPath = join(workspace, 'survey.js');
await writeFile(
  scriptPath,
  `
const scores = [5, 3, 4, 2, 5];
const average = scores.reduce((sum, score) => sum + score, 0);
console.log("average=" + average);
`.trim()
);

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
survey.js は平均満足度を出すつもりですが、今は合計を出してしまいます。
バグを修正し、node survey.js を実行して average=3.8 になることを確認してください。
確認したコマンドと結果を最終回答にも含めてください。
`.trim());

console.log('\nWorkspace:', workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
console.log('\n=== 修正後のsurvey.js ===\n');
console.log(await readFile(scriptPath, 'utf8'));
displayItemSummary(turn.items);
displayFileChanges(turn.items);
displayCommandExecutions(turn.items);

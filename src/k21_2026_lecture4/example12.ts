/**
 * 同じCodex threadで、調査、計画、実装、検証を段階的に進める開発ワークフロー例。
 */

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import {
  displayCommandExecutions,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-workflow-'));
await writeFile(join(workspace, 'README.md'), '# Lecture workflow sandbox\n');

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

displayWorkspace(workspace);

const plan = await thread.run(`
第3回のtools/MCP/guardrailsアンケート改善を題材にした、小さなNode.jsレポート生成スクリプトの実装計画を3点で出してください。
計画には、入力データ、計算、出力JSONを含めてください。
`.trim());
displayFinalResponse('計画', plan.finalResponse);
displayItemSummary(plan.items);

const implementation = await thread.run(`
計画に基づき report.js を作成してください。
満足度 [5,3,4,2,5] の平均、完了数3/5、難所 tools/MCP/guardrails、改善アクションを含むJSONを出力するスクリプトにしてください。
`.trim());
displayFinalResponse('実装', implementation.finalResponse);
displayItemSummary(implementation.items);
displayFileChanges(implementation.items);

const verification = await thread.run(`
node report.js を実行し、JSONが出力されることを確認してください。
平均満足度が3.8であることも確認し、確認したコマンドと結果を回答に含めてください。
`.trim());
displayFinalResponse('検証', verification.finalResponse);
displayItemSummary(verification.items);
displayCommandExecutions(verification.items);
displayThreadInfo(thread.id, verification.usage);
console.log('\n=== report.js ===\n');
console.log(await readFile(join(workspace, 'report.js'), 'utf8'));

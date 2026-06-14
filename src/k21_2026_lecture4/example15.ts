/**
 * 同じCodex threadで、調査、計画、実装、検証を段階的に進める開発ワークフロー例。
 */

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

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

const plan = await thread.run('第3回講義改善レポートを作る小さなNode.jsスクリプトの実装計画を3点で出してください。');
console.log('\n=== 計画 ===\n');
console.log(plan.finalResponse);

const implementation = await thread.run(`
計画に基づき report.js を作成してください。
満足度 [5,3,4,2,5] の平均と、題材 tools/MCP/guardrails を含むJSONを出力するスクリプトにしてください。
`.trim());
console.log('\n=== 実装 ===\n');
console.log(implementation.finalResponse);

const verification = await thread.run('node report.js を実行し、JSONが出力されることを確認してください。');
console.log('\n=== 検証 ===\n');
console.log(verification.finalResponse);
console.log('\n=== report.js ===\n');
console.log(await readFile(join(workspace, 'report.js'), 'utf8'));

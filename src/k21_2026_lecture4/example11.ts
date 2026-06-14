/**
 * Codexをread-onlyのレビュー担当として使い、コード変更なしで問題点だけを報告させる例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-review-'));
await writeFile(
  join(workspace, 'survey.js'),
  `
export function average(scores) {
  return scores.reduce((sum, score) => sum + score, 0);
}
`.trim()
);

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
survey.js をレビューしてください。
平均値を返す関数としてのバグ、リスク、足りないテストを重大度順に報告してください。
ファイルは変更しないでください。
`.trim());

console.log('\nWorkspace:', workspace);
console.log('\n=== レビュー結果 ===\n');
console.log(turn.finalResponse);
console.log('\nfile changes:', turn.items.filter((item) => item.type === 'file_change').length);

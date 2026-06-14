/**
 * Codexに一時ワークスペースでスクリプトを書かせ、lecture3のアンケート分析をコード実行で再現する例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-analysis-'));
await writeFile(
  join(workspace, 'survey.csv'),
  `
name,satisfaction,hardest_topic
Alice,5,tools
Bob,3,MCP
Carol,4,MCP
Dave,2,guardrails
Eve,5,tools
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
survey.csv を分析する小さなJavaScriptスクリプトを作成して実行してください。
平均満足度、最頻出の難所、次回改善案を日本語で報告してください。
`.trim());

console.log('\nWorkspace:', workspace);
console.log('\n=== 分析結果 ===\n');
console.log(turn.finalResponse);
console.log('\ncommand executions:', turn.items.filter((item) => item.type === 'command_execution').length);

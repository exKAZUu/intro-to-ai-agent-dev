/**
 * Codexに一時ワークスペースでスクリプトを書かせ、lecture3のアンケート分析をコード実行で再現する例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { displayCommandExecutions, displayFileChanges, displayFinalResponse, displayItemSummary } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-analysis-'));
await writeFile(
  join(workspace, 'survey.csv'),
  `
name,attendance_type,satisfaction,hardest_topic,hands_on_completed,request
Alice,対面,5,tools,完了,実用例を増やしたい
Bob,オンライン,3,MCP,未完了,接続手順を詳しく知りたい
Carol,対面,4,MCP,完了,Excel連携を試したい
Dave,録画,2,guardrails,未完了,失敗例があると理解しやすい
Eve,対面,5,tools,完了,業務に近い題材がよい
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
平均満足度、ハンズオン完了率、最頻出の難所、次回改善案を日本語で報告してください。
分析は必ず作成したスクリプトで行い、最後に実行したコマンドも書いてください。
`.trim());

console.log('\nWorkspace:', workspace);
displayFinalResponse('分析結果', turn.finalResponse);
displayItemSummary(turn.items);
displayFileChanges(turn.items);
displayCommandExecutions(turn.items);

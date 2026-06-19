/**
 * Agents SDKで自作しがちなファイル読み取りtoolを、Codex SDKのworkspace読み取りで置き換える例。
 */

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWorkspace } from './helpers.js';

const workspace = process.cwd();
const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
src/k21_2026_lecture3/example08.ts と src/k21_2026_lecture4/example06.ts を読み、
Hosted code interpreterを使う一時分析と、リポジトリに分析スクリプトを残すCodex SDKの進め方の違いを、根拠ファイル名付きで説明してください。
ファイル読み取りtoolを自作せずに、workspace内の教材コードを直接読む例として答えてください。
ファイルは変更しないでください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);

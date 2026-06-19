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
src/k21_2026_lecture3/README.md と src/k21_2026_lecture4/README.md を読み、
第3回から第4回へ何が発展しているかを、根拠ファイル名付きで説明してください。
単なる社内資料QAではなく、コードベース内の複数教材ファイルを読む開発支援として答えてください。
ファイルは変更しないでください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);

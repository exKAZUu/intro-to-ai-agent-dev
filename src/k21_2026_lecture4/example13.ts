/**
 * webSearchModeで公式情報を確認し、ローカルコードベース文脈と組み合わせる例。
 */

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWebSearches } from './helpers.js';

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  webSearchMode: 'cached',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(
  `
src/k21_2026_lecture4/example01.ts と example06.ts を読み、Codex SDKの使い方を確認してください。
さらにweb searchでCodex SDKまたはOpenAI公式ドキュメントの関連情報を確認し、授業で補足すべき注意点を3つ挙げてください。
参照先はOpenAI公式ドキュメントまたはCodex SDKの公式情報に限定してください。
ファイルは変更しないでください。
`.trim()
);

displayFinalResponse('調査結果', turn.finalResponse);
displayItemSummary(turn.items);
displayWebSearches(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);

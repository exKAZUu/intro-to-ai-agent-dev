/**
 * webSearchModeで公式情報を確認し、ローカルコードベース文脈と組み合わせる例。
 */

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWebSearches } from './helpers.js';

const codex = new Codex();
let usedFallback = false;

const prompt = `
src/k21_2026_lecture4/example01.ts と src/k21_2026_lecture4/example06.ts を読み、Codex SDKの使い方を確認してください。
さらにweb searchでCodex SDKまたはOpenAI公式ドキュメントの関連情報を確認し、授業で補足すべき注意点を3つ挙げてください。
参照先はOpenAI公式ドキュメントまたはCodex SDKの公式情報に限定してください。
ファイルは変更しないでください。
`.trim();

let thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  webSearchMode: 'live',
  modelReasoningEffort: 'low',
});

let turn;
try {
  turn = await thread.run(prompt);
} catch (error) {
  usedFallback = true;
  thread = codex.startThread({
    workingDirectory: process.cwd(),
    sandboxMode: 'read-only',
    approvalPolicy: 'never',
    webSearchMode: 'disabled',
    modelReasoningEffort: 'low',
  });
  turn = await thread.run(`
web search が利用できない環境として扱います。
src/k21_2026_lecture4/example01.ts と src/k21_2026_lecture4/example06.ts を読み、
ローカルコード文脈だけから授業で補足すべき注意点を3つ挙げてください。
web search が失敗したため、公式情報の確認は講師デモまたは環境設定後に行う必要があることも含めてください。
ファイルは変更しないでください。

元のエラー:
${error instanceof Error ? error.message : String(error)}
`.trim());
}

displayFinalResponse('調査結果', turn.finalResponse);
if (usedFallback) console.log('\nweb searchが失敗したため、ローカル文脈のみでフォールバックしました。');
displayItemSummary(turn.items);
displayWebSearches(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);

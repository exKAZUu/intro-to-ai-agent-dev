/**
 * 同じCodex threadに続けて依頼し、前ターンのリポジトリ理解を設計判断に使う例。
 */

import { Codex } from '@openai/codex-sdk';

import { displayFinalResponse, displayItemSummary, displayThreadInfo } from './helpers.js';

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const first = await thread.run(`
src/lecture1、src/k21_2026_lecture2、src/k21_2026_lecture3 の構成を確認してください。
講義1から第3回にかけて、LLM単体、Responses API、Function Calling、Agents SDKへどう進んでいるかを3点で要約してください。
ファイルは変更しないでください。
`.trim());
displayFinalResponse('1回目', first.finalResponse);
displayItemSummary(first.items);

const second = await thread.run(`
先ほどの理解を踏まえて、src/k21_2026_lecture4 で Codex SDK を教えるときに対応させるべき概念を3つ挙げてください。
各概念は「第3回の概念 -> Codex SDKでの見せ方」の形で説明してください。
ファイルは変更しないでください。
`.trim());
displayFinalResponse('2回目', second.finalResponse);
displayItemSummary(second.items);
displayThreadInfo(thread.id, second.usage);

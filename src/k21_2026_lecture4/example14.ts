/**
 * webSearchModeで公式情報を確認し、ローカルコードベース文脈と組み合わせる例。
 */

import { Codex, type RunResult } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWebSearches } from './helpers.js';

const codex = new Codex();
const liveSearchTimeoutMs = 60_000;
let usedFallback = false;

const prompt = `
src/k21_2026_lecture4/example01.ts と src/k21_2026_lecture4/example07.ts を読み、Codex SDKの使い方を確認してください。
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

let turn: RunResult;
try {
  turn = await runWithTimeout(prompt, liveSearchTimeoutMs);
} catch (error) {
  usedFallback = true;
  turn = await runLocalFallback(`run()が例外を投げました: ${error instanceof Error ? error.message : String(error)}`);
}

if (!usedFallback && shouldFallbackFromLiveSearchResult(turn)) {
  usedFallback = true;
  turn = await runLocalFallback(createFallbackReason(turn));
}

displayFinalResponse('調査結果', turn.finalResponse);
if (usedFallback) console.log('\nweb searchを確認できなかったため、ローカル文脈のみでフォールバックしました。');
displayItemSummary(turn.items);
displayWebSearches(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);

async function runLocalFallback(reason: string) {
  thread = codex.startThread({
    workingDirectory: process.cwd(),
    sandboxMode: 'read-only',
    approvalPolicy: 'never',
    webSearchMode: 'disabled',
    modelReasoningEffort: 'low',
  });
  return await thread.run(`
web search が利用できない、または利用できたことを確認できない環境として扱います。
src/k21_2026_lecture4/example01.ts と src/k21_2026_lecture4/example07.ts を読み、
ローカルコード文脈だけから授業で補足すべき注意点を3つ挙げてください。
公式情報の確認は講師デモまたは環境設定後に行う必要があることも含めてください。
ファイルは変更しないでください。

fallback理由:
${reason}
`.trim());
}

async function runWithTimeout(prompt: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await thread.run(prompt, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function shouldFallbackFromLiveSearchResult(turn: RunResult) {
  return hasErrorItem(turn) || !hasWebSearchItem(turn);
}

function createFallbackReason(turn: RunResult) {
  const errors = turn.items.flatMap((item) => (item.type === 'error' ? [item.message] : []));
  if (errors.length > 0) return `error itemが返りました: ${errors.join(' / ')}`;
  return 'webSearchMode: live で実行しましたが、web_search itemを確認できませんでした。';
}

function hasErrorItem(turn: RunResult) {
  return turn.items.some((item) => item.type === 'error');
}

function hasWebSearchItem(turn: RunResult) {
  return turn.items.some((item) => item.type === 'web_search');
}

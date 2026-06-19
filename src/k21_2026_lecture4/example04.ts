/**
 * runStreamedを使い、Codexが読み取りやコマンド実行を進める途中イベントを観測する例。
 */

import { Codex } from '@openai/codex-sdk';

import type { ThreadEvent } from '@openai/codex-sdk';

import { displayEvent, displayFinalResponse } from './helpers.js';

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const { events } = await thread.runStreamed(`
src/k21_2026_lecture3/example01.ts から example05.ts までを確認してください。
LLM単体、Responses APIのFunction Calling、Agents SDKのtoolへ進む流れを1段落で説明してください。
ファイルは変更しないでください。
`.trim());

let finalResponse = '';
const eventTypes = new Map<ThreadEvent['type'], number>();
const completedItemTypes: string[] = [];
for await (const event of events) {
  eventTypes.set(event.type, (eventTypes.get(event.type) ?? 0) + 1);
  displayEvent(event);
  if (event.type === 'item.completed') {
    completedItemTypes.push(event.item.type);
    if (event.item.type === 'agent_message') finalResponse = event.item.text;
  }
}

displayFinalResponse('最終回答', finalResponse);
console.log('\n=== イベント種別 ===\n');
console.dir(Object.fromEntries(eventTypes), { depth: null });
console.log('\n=== 完了したitem種別 ===\n');
console.dir(completedItemTypes, { depth: null });

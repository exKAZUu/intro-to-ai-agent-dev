/**
 * Agents SDKのstreaming相当を、Codex SDKのrunStreamed()で置き換える例。
 */

import { Codex, type ThreadEvent } from '@openai/codex-sdk';

import { displayEvent, displayFinalResponse, displayWorkspace } from './helpers.js';

const workspace = process.cwd();
const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const { events } = await thread.runStreamed(`
src/k21_2026_lecture3/example08.ts と src/k21_2026_lecture4/example06.ts を読み、
Hosted code interpreter と Codex SDK の違いを、根拠ファイル名付きで3点に整理してください。
ファイルは変更しないでください。
`.trim());

let finalResponse = '';
const eventTypes = new Map<ThreadEvent['type'], number>();
const completedItemTypes: string[] = [];
let completedFileChangeCount = 0;

displayWorkspace(workspace);
for await (const event of events) {
  eventTypes.set(event.type, (eventTypes.get(event.type) ?? 0) + 1);
  displayEvent(event);
  if (event.type === 'item.completed') {
    completedItemTypes.push(event.item.type);
    if (event.item.type === 'file_change') completedFileChangeCount += 1;
    if (event.item.type === 'agent_message') finalResponse = event.item.text;
  }
}

displayFinalResponse('最終回答', finalResponse);
console.log('\n=== イベント種別 ===\n');
console.dir(Object.fromEntries(eventTypes), { depth: null });
console.log('\n=== 完了したitem種別 ===\n');
console.dir(completedItemTypes, { depth: null });
console.log('\nfile_change items:', completedFileChangeCount);
if (completedFileChangeCount > 0) {
  throw new Error('read-onlyで実行したstreamed turnにfile_change itemが含まれています。');
}

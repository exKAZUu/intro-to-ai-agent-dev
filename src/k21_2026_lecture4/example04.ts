/**
 * Agents SDKのstreaming相当を、Codex SDKのrunStreamed()で置き換える例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';
import type { ThreadEvent } from '@openai/codex-sdk';

import { displayEvent, displayFinalResponse, displayWorkspace } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-streaming-'));
await writeFile(
  join(workspace, 'notes.md'),
  `
# Codex SDK メモ

- startThreadで会話を始める
- runでturnを実行する
- runStreamedで途中イベントを観察する
`.trim()
);

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const { events } = await thread.runStreamed(`
notes.md を読み、Codex SDKのstreamingを授業でどう見せるべきかを1段落で説明してください。
ファイルは変更しないでください。
`.trim());

let finalResponse = '';
const eventTypes = new Map<ThreadEvent['type'], number>();
const completedItemTypes: string[] = [];

displayWorkspace(workspace);
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

/**
 * runStreamedを使い、Codexが読み取りやコマンド実行を進める途中イベントを観測する例。
 */

import { Codex } from '@openai/codex-sdk';

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const { events } = await thread.runStreamed(`
src/k21_2026_lecture3/example01.ts から example03.ts までを確認し、アクセスログ集計を改善していく流れを1段落で説明してください。
ファイルは変更しないでください。
`.trim());

let finalResponse = '';
for await (const event of events) {
  if (event.type === 'item.completed') {
    console.log('completed item:', event.item.type);
    if (event.item.type === 'agent_message') finalResponse = event.item.text;
  }
  if (event.type === 'turn.completed') {
    console.log('usage:', event.usage);
  }
}

console.log('\n=== 最終回答 ===\n');
console.log(finalResponse);

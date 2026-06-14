/**
 * CodexのwebSearchModeを有効にし、lecture3/example07のhosted web search相当として外部情報を調べる例。
 */

import { Codex } from '@openai/codex-sdk';

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  webSearchMode: 'cached',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
OpenAI Agents SDK TypeScript の tools、MCP、guardrails について、第3回講義で扱う理由を日本語で短く整理してください。
可能なら参照した情報源も示してください。ファイルは変更しないでください。
`.trim());

console.log('\n=== 調査結果 ===\n');
console.log(turn.finalResponse);
console.log('\nweb search items:', turn.items.filter((item) => item.type === 'web_search').length);

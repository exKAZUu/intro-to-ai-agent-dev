/**
 * CodexのwebSearchModeを有効にし、前例のアンケート分析結果を外部情報で補強する例。
 */

import { Codex } from '@openai/codex-sdk';

import { displayFinalResponse, displayItemSummary, displayWebSearches } from './helpers.js';

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
前の例では、第3回の試行授業アンケートから以下の結果を得ました。

- 平均満足度: 3.8
- 最頻出の難所: tools, MCP
- 改善アクション: toolsの利用手順を整理する、MCPの基本概念と接続手順を補足する、toolsとMCPを組み合わせた演習を追加する

web searchを使って OpenAI Agents SDK TypeScript の tools と MCP の公式情報を確認し、このアンケート結果に基づく次回改善案を3つに絞ってください。
各改善案には、どの難所に対応するか、授業で追加する具体的な演習、参照した情報源を含めてください。
参照先は OpenAI 公式ドキュメントまたは Agents SDK JavaScript/TypeScript 公式ドキュメントに限定してください。
ファイルは変更しないでください。
`.trim()
);

displayFinalResponse('調査結果', turn.finalResponse);
displayItemSummary(turn.items);
displayWebSearches(turn.items);

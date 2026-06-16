/**
 * Playwright MCP Serverを使い、ブラウザ操作を外部MCPツールとして扱う例。
 */

import { Agent, MCPServerStdio, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

// 事前に `npx --yes playwright install chromium` を実行しておくこと
const mcpServer = new MCPServerStdio({
  name: 'Playwright MCP Server',
  fullCommand: 'npx --yes @playwright/mcp@latest',
  clientSessionTimeoutSeconds: 30,
  timeout: 30000,
});
await mcpServer.connect();

try {
  const agent = new Agent({
    name: 'Restaurant booking browser assistant',
    instructions: `
あなたはブラウザ操作を行うアシスタントです。
Playwright MCP Serverのブラウザ操作ツールだけを使って、ユーザーの指示に従ってウェブページを操作してください。
最終回答では、表示した予約画面または予約候補、確認できた条件、根拠URLを簡潔にまとめてください。
追加質問や次の作業提案は書かないでください。
`.trim(),
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
  });

  const response = await run(
    agent,
    '新宿駅の周辺にある焼肉屋で明日19時から4名で予約できるお店を探して、予約画面を表示して。',
    { maxTurns: 10 }
  );
  displayMcpItems(response.newItems);
  displayResult(response.finalOutput);
  displayComparison();
} finally {
  await mcpServer.close();
}

function displayMcpItems(items: { toJSON(): unknown }[]) {
  console.log('\n=== MCPツール呼び出し ===\n');
  console.dir(extractMcpItems(items), { depth: null });
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== 予約候補確認結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayComparison() {
  console.log('\n=== MCPなし/ありの比較 ===\n');
  console.log('なし: LLMは飲食店検索サイトの画面を実際に操作できず、予約可能条件の確認も推測に留まります。');
  console.log('あり: Playwright MCP Server のツールでブラウザを操作し、予約候補や予約画面を確認できます。');
}

function extractMcpItems(items: { toJSON(): unknown }[]) {
  const calls = new Map<string, { arguments?: string; name?: string; output?: string }>();
  for (const item of items) {
    const itemJson = item.toJSON() as {
      rawItem?: {
        callId?: string;
        name?: string;
        type?: string;
        arguments?: string;
      };
      output?: string;
    };
    const callId = itemJson.rawItem?.callId;
    if (!callId) {
      continue;
    }
    const current = calls.get(callId) ?? {};
    if (itemJson.rawItem?.type === 'function_call') {
      calls.set(callId, {
        ...current,
        arguments: itemJson.rawItem.arguments,
        name: itemJson.rawItem.name,
      });
    } else if (itemJson.rawItem?.type === 'function_call_result') {
      calls.set(callId, {
        ...current,
        output: itemJson.output,
      });
    }
  }
  return [...calls.values()];
}

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
    name: 'Workshop browser inspector',
    instructions: `
あなたはAIエージェント開発ワークショップの教材調査担当です。
Playwright MCP Serverのブラウザ操作ツールだけを使って、公式ドキュメントを実際に開いて確認してください。
最終回答は「確認したページ」「教材に足す観点」「根拠URL」をそれぞれ1行でまとめてください。
追加質問や次の作業提案は書かないでください。
`.trim(),
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
  });

  const response = await run(
    agent,
    `
Agents SDK JavaScript/TypeScript のMCPページを開き、ワークショップで説明すべきMCPの要点を1つ確認してください。
可能なら https://openai.github.io/openai-agents-js/guides/mcp/ から確認してください。
`.trim(),
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
  console.log('\n=== ブラウザ調査結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayComparison() {
  console.log('\n=== MCPなし/ありの比較 ===\n');
  console.log('なし: LLMはURLを推測して説明できますが、実際のページ表示や遷移は確認できません。');
  console.log('あり: Playwright MCP Server のツールでブラウザを操作し、表示された公式ページを確認できます。');
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

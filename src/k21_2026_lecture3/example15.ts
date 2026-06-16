/**
 * Find a DomainのStreamable HTTP MCP Serverを使い、ドメイン候補を確認する例。
 */

import { Agent, MCPServerStreamableHttp, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const mcpServer = new MCPServerStreamableHttp({
  name: 'Find a Domain MCP Server',
  url: 'https://api.findadomain.dev/mcp',
  clientSessionTimeoutSeconds: 30,
  timeout: 30000,
});
await mcpServer.connect();

try {
  const agent = new Agent({
    name: 'Workshop domain planner',
    instructions: `
あなたはAIエージェント開発ワークショップの公開準備担当です。
Find a Domain MCP Serverのツールを使って、ワークショップ改善ページに使えるドメイン候補の空き状況を確認してください。
最終回答では、取得可能な候補を最大3つ、候補ごとの理由を短く日本語でまとめてください。
追加質問や次の作業提案は書かないでください。
`.trim(),
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
  });

  const response = await run(
    agent,
    `
早稲田大学のAIエージェント開発ワークショップ改善ページ向けに、短く読みやすいドメイン候補を確認してください。
候補には ai-agent、workshop、waseda のいずれかを含めてください。
`.trim(),
    { maxTurns: 8 }
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
  console.log('\n=== ドメイン確認結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayComparison() {
  console.log('\n=== MCPなし/ありの比較 ===\n');
  console.log('なし: ドメインの空き状況はモデル知識だけでは確認できません。');
  console.log('あり: Streamable HTTP MCP Server のリモートツールで、外部サービスの確認結果を回答に使えます。');
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

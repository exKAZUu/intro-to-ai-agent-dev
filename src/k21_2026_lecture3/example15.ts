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
    name: 'AI agent domain planner',
    instructions: `
あなたはAIエージェント関連サービスの公開準備担当です。
Find a Domain MCP Serverのツールを使って、AIエージェント関連サービスの名前として良いドメイン候補を探してください。
空き状況だけを優先せず、ブランド名として自然な英語、短さ、覚えやすさを重視してください。
確認するTLDは .jp だけにしてください。
良い名前を考える、空き状況を確認する、取得済みなら別の候補を考えて再確認する、という流れを繰り返してください。
最終回答では、ツール結果の status が available の候補だけから良いと思うものを3つ選び、候補ごとの確認結果と理由を短く日本語でまとめてください。
taken や error の候補は最終候補に含めないでください。
追加質問や次の作業提案は書かないでください。
`.trim(),
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
  });

  const response = await run(
    agent,
`
AIエージェント関連サービス向けに、短く覚えやすく、サービス内容が伝わりやすいドメイン候補を探してください。
不自然な造語や長すぎる名前は避けてください。
候補は .jp だけを確認してください。
良い名前を確認し、取得済みなら少し方向を変えた良い名前を再度確認してください。
最終的に取得可能な候補を3つ出してください。
`.trim(),
    { maxTurns: 16 }
  );
  displayMcpItems(response.newItems);
  displayResult(response.finalOutput);
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

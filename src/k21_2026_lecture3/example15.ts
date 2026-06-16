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
確認するTLDは .com だけにしてください。
良い名前を考える、空き状況を確認する、取得済みなら別の候補を考えて再確認する、という流れを繰り返してください。
同じ候補を繰り返し確認しないでください。
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
候補は .com だけを確認してください。
良い名前を確認し、取得済みなら少し方向を変えた良い名前を再度確認してください。
最終的に取得可能な候補を3つ出してください。
`.trim(),
    { maxTurns: 16, stream: true }
  );
  await displayProgress(response);
  displayResult(response.finalOutput);
} finally {
  await mcpServer.close();
}

async function displayProgress(events: AsyncIterable<{ type: string; name?: string; item?: { toJSON(): unknown } }>) {
  console.log('\n=== ドメイン確認の途中経過 ===\n');
  const domainsByCallId = new Map<string, string>();
  for await (const event of events) {
    displayProgressEvent(event, domainsByCallId);
  }
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== ドメイン確認結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayProgressEvent(
  event: { type: string; name?: string; item?: { toJSON(): unknown } },
  domainsByCallId: Map<string, string>
) {
  if (event.type !== 'run_item_stream_event' || !event.item) {
    return;
  }
  const itemJson = event.item.toJSON() as {
    output?: string;
    rawItem?: {
      arguments?: string;
      callId?: string;
      name?: string;
      output?: string | { text?: string; type?: string };
      type?: string;
    };
  };
  const callId = itemJson.rawItem?.callId;
  if (!callId) {
    return;
  }
  if (event.name === 'tool_called' && itemJson.rawItem?.type === 'function_call') {
    const domain = extractDomain(itemJson.rawItem.arguments);
    if (domain) {
      domainsByCallId.set(callId, domain);
      console.log(`確認中: ${domain}`);
    }
  } else if (event.name === 'tool_output' && itemJson.rawItem?.type === 'function_call_result') {
    const status = extractStatus(itemJson.output ?? itemJson.rawItem.output);
    const domain = domainsByCallId.get(callId) ?? callId;
    console.log(`結果: ${domain} -> ${status ?? 'unknown'}`);
  }
}

function extractDomain(argumentsJson: string | undefined) {
  if (!argumentsJson) {
    return undefined;
  }
  const parsed = JSON.parse(argumentsJson) as { name?: string; tld?: string };
  if (!parsed.name || !parsed.tld) {
    return undefined;
  }
  return `${parsed.name}.${parsed.tld}`;
}

function extractStatus(output: string | { text?: string; type?: string } | undefined) {
  const text = typeof output === 'string' ? output : output?.text;
  if (!text) {
    return undefined;
  }
  const parsed = JSON.parse(text) as { status?: string; text?: string };
  if (parsed.status) {
    return parsed.status;
  }
  return parsed.text ? (JSON.parse(parsed.text) as { status?: string }).status : undefined;
}

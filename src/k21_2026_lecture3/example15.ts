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
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
  });

  const response = await run(
    agent,
    `
AIエージェント関連サービス向けの .com ドメイン候補を探してください。
短く覚えやすい自然な英語名を重視し、取得済みなら別候補を確認してください。
taken や error だった候補も含め、確認済みの候補名は再確認しないでください。
最終回答では status が available の候補だけを3つ選び、理由を短くまとめてください。
`.trim(),
    { maxTurns: 32, stream: true }
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

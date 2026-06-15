/**
 * Agents SDKの受付エージェントが、コードベース調査だけをCodex MCPへ委譲する例。
 */

import { Agent, MCPServerStdio, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const mcpServer = new MCPServerStdio({
  name: 'Codex MCP Server',
  fullCommand: 'codex mcp-server',
  clientSessionTimeoutSeconds: 180,
  timeout: 180000,
});
await mcpServer.connect();

try {
  const codexAgent = new Agent({
    name: 'Codebase investigation agent',
    handoffDescription: 'リポジトリのファイル調査やコード読解が必要な依頼を担当します。',
    instructions: `
コードベース調査は Codex MCP Server の codex ツールで行ってください。
Codexには approval-policy=never, sandbox=read-only, cwd=${process.cwd()} を指定してください。
調査が終わったら、追加確認を求めずに最終回答を返してください。
`.trim(),
    model: 'gpt-5-mini',
    mcpServers: [mcpServer],
  });

  const triageAgent = Agent.create({
    name: 'Lecture4 triage agent',
    instructions: '一般的な講義相談は自分で答え、リポジトリ調査が必要な依頼は Codebase investigation agent に委譲してください。',
    model: 'gpt-5-mini',
    handoffs: [codexAgent],
  });

  const response = await run(
    triageAgent,
    `
k21_2026_lecture3のexample07.tsとexample08.tsがどう接続しているか、リポジトリを調べて説明してください。
リポジトリ調査は Codebase investigation agent に委譲し、Codex MCP Server の codex ツールは1回だけ使ってください。
`.trim(),
    { maxTurns: 14 }
  );
  console.log('\n=== Handoff結果 ===\n');
  console.log(response.finalOutput);
  displayHandoffsAndMcpCalls(response.newItems);
} finally {
  await mcpServer.close();
}

function displayHandoffsAndMcpCalls(items: { toJSON(): unknown }[]) {
  type Observation =
    | { from: string | undefined; kind: 'handoff'; to: string | undefined }
    | { kind: 'mcp_call'; server: string | undefined; tool: string | undefined };

  console.log('\n=== Handoff / MCP の観察ログ ===\n');
  console.dir(
    items.flatMap<Observation>((item) => {
      const itemJson = item.toJSON() as {
        rawItem?: { name?: string; serverLabel?: string };
        sourceAgent?: { name?: string };
        targetAgent?: { name?: string };
        type?: string;
      };
      if (itemJson.sourceAgent && itemJson.targetAgent && itemJson.rawItem?.name?.startsWith('transfer_to_')) {
        return [{ kind: 'handoff', from: itemJson.sourceAgent.name, to: itemJson.targetAgent.name }];
      }
      if (itemJson.type === 'mcp_call') {
        return [{ kind: 'mcp_call', server: itemJson.rawItem?.serverLabel, tool: itemJson.rawItem?.name }];
      }
      return [];
    }),
    { depth: null }
  );
}

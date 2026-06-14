/**
 * Codex MCP ServerをAgents SDKから接続し、Codexをリポジトリ調査用ツールとして呼ぶ例。
 */

import { Agent, MCPServerStdio, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const mcpServer = new MCPServerStdio({
  name: 'Codex MCP Server',
  fullCommand: 'codex mcp-server',
  clientSessionTimeoutSeconds: 60,
  timeout: 60000,
});
await mcpServer.connect();

try {
  const agent = new Agent({
    name: 'Codex MCP repo analyst',
    instructions: `
あなたは講義設計アシスタントです。
リポジトリ調査が必要な場合は Codex MCP Server の codex ツールを使ってください。
Codexには approval-policy=never, sandbox=read-only, cwd=${process.cwd()} を指定してください。
`.trim(),
    model: 'gpt-5-mini',
    mcpServers: [mcpServer],
  });

  const response = await run(
    agent,
    `
Codex MCP Server の codex ツールを1回使って、src/k21_2026_lecture3 のexample01.tsからexample04.tsだけを調査してください。
lecture4で対応させるべき要点を3つにまとめ、各要点で参照したファイル名を添えてください。
`.trim(),
    { maxTurns: 12 }
  );
  console.log('\n=== Codex MCP調査結果 ===\n');
  console.log(response.finalOutput);
} finally {
  await mcpServer.close();
}

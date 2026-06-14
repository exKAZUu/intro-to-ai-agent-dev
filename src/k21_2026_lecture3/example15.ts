/**
 * Excel MCP Serverを使い、既存の成績ファイルをエージェントに分析させる例。
 */

import { Agent, MCPServerStdio, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const mcpServer = new MCPServerStdio({
  name: 'Excel MCP Server',
  fullCommand: 'npx --yes @negokaz/excel-mcp-server',
  clientSessionTimeoutSeconds: 30,
  timeout: 30000,
});
await mcpServer.connect();

try {
  const agent = new Agent({
    name: 'Lecture score workbook analyst',
    instructions: `
あなたは講義成績ファイルの分析担当です。
Excel MCP Serverのツールを使ってファイルを読み、平均点、最高点、合格者数を確認して、講義改善コメントを作ってください。
`.trim(),
    model: 'gpt-5-mini',
    mcpServers: [mcpServer],
  });

  const response = await run(
    agent,
    `
次の成績データを /Users/exkazuu/ghq/github.com/exKAZUu/intro-to-ai-agent-dev/src/k21_2026_lecture3/scores.xlsx の Scores シートに作成し、その後で平均点、最高点、70点以上の合格者数、講義改善コメントを報告してください。

name,score
Alice,82
Bob,66
Carol,91
Dave,58
Eve,74
`.trim(),
    { maxTurns: 10 }
  );
  displayResult(response.finalOutput);
} finally {
  await mcpServer.close();
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== Excel分析結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

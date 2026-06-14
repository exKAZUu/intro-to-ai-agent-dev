/**
 * Excel MCP Serverを使い、同じ講義改善データをExcelファイルとして作成・分析する例。
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
    name: 'Lecture survey workbook analyst',
    instructions: `
あなたは第3回講義アンケートのExcel分析担当です。
Excel MCP Serverのツールを使ってファイルにデータを書き込み、平均満足度、最頻出の難所、改善コメントを報告してください。
`.trim(),
    model: 'gpt-5-mini',
    mcpServers: [mcpServer],
  });

  const response = await run(
    agent,
    `
次のアンケートデータを /Users/exkazuu/ghq/github.com/exKAZUu/intro-to-ai-agent-dev/src/k21_2026_lecture3/scores.xlsx の Survey シートに作成し、その後で平均満足度、最頻出の難所、改善コメントを報告してください。

name,satisfaction,hardest_topic
Alice,5,tools
Bob,3,MCP
Carol,4,MCP
Dave,2,guardrails
Eve,5,tools
`.trim(),
    { maxTurns: 10 }
  );
  displayResult(response.finalOutput);
} finally {
  await mcpServer.close();
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== Excelアンケート分析結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

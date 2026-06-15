/**
 * Excel MCP Serverを使い、講義改善データをExcelファイルとして作成・分析する例。
 */

import { Agent, MCPServerStdio, run } from '@openai/agents';
import { readSurveyCsv } from './survey-data.js';

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
    model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
  });

  const surveyCsv = await readSurveyCsv();
  const response = await run(
    agent,
    `
次のアンケートデータを ${process.cwd()}/src/k21_2026_lecture3/scores.xlsx の Survey シートに作成し、その後で平均満足度、最頻出の難所、改善コメントを報告してください。

${surveyCsv}
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

/**
 * Excel MCP Serverを使い、アンケートデータをExcelファイルとして作成・分析する例。
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
    name: 'Survey workbook analyst',
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
  });

  const surveyCsv = await readSurveyCsv();
  const workbookPath = createSurveyWorkbookPath();
  const response = await run(
    agent,
    `
あなたは演習アンケートのExcel分析担当です。
Excel MCP Serverのツールを使ってファイルにデータを書き込み、平均満足度、最頻出の難所、改善コメントを報告してください。
最後は改善コメントで締め、追加質問や次の作業提案は書かないでください。

次のアンケートデータを ${workbookPath} という新しいExcelファイルの Survey シートに作成し、その後で平均満足度、最頻出の難所、改善コメントを報告してください。
既存の scores.xlsx は更新しないでください。

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

function createSurveyWorkbookPath() {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  return `${process.cwd()}/src/k21_2026_lecture3/survey-scores-${timestamp}.xlsx`;
}

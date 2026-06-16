/**
 * Excel MCP Serverを使い、アンケートデータをExcelファイルとして作成・分析する例。
 */

import { copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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
    name: 'Survey workbook analyst',
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
  });

  const surveyCsv = await readFile(new URL('./survey.csv', import.meta.url), 'utf8');
  const workbookPath = await createSurveyWorkbook();
  const response = await run(
    agent,
    `
あなたは演習アンケートのExcel分析担当です。
Excel MCP Serverのツールで、事前に作成済みの新しいExcelファイル ${workbookPath} に Survey シートを追加し、次のCSVを書き込んでください。
その後、平均満足度、最頻出の難所、改善コメントを報告してください。
既存の scores.xlsx は更新しないでください。
最後は改善コメントで締め、追加質問や次の作業提案は書かないでください。

${surveyCsv}
`.trim(),
    { maxTurns: 10 }
  );
  displayResult(response.finalOutput);
  displayComparison(workbookPath);
} finally {
  await mcpServer.close();
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== Excelアンケート分析結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayComparison(workbookPath: string) {
  console.log('\n=== MCPなし/ありの比較 ===\n');
  console.log('なし: LLMはCSVの集計結果を文章で返せても、ExcelファイルにSurveyシートを書き込む要件は満たせません。');
  console.log(`あり: Excel MCP Server のツールで新しい workbook に Survey シートを書き込みました: ${workbookPath}`);
}

async function createSurveyWorkbook() {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const workbookPath = fileURLToPath(new URL(`./survey-scores-${timestamp}.xlsx`, import.meta.url));
  await copyFile(new URL('./scores.xlsx', import.meta.url), workbookPath);
  return workbookPath;
}

/**
 * Excel MCP Serverを使い、既存シートのアンケート回答から集計表を作成する例。
 */

import { copyFile } from 'node:fs/promises';
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
  const workbookPath = await createSurveyWorkbook();
  const agent = new Agent({
    name: 'Survey workbook analyst',
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
  });
  const response = await run(
    agent,
    `
事前に作成済みの新しいExcelファイル ${workbookPath} を更新してください。

このブックには、既に SurveyResponses シートの A1:H21 にアンケート回答が入っています。
必ずExcel MCP Serverのツールで SurveyResponses シートを読み取り、読み取ったデータから必要な集計を行ってください。
プロンプト中の情報だけで集計したり、集計済みの表を転記したりしないでください。

SurveyAnalysis シートを次の内容に更新してください。

1. A1:E21 に次の列を持つ回答別の分析表を作る。
   - participant_id
   - satisfaction
   - hardest_topic
   - request
   - follow_up_priority
2. follow_up_priority は、satisfaction が3以下、または hands_on_completed が「未完了」の回答を「要フォロー」、それ以外を「通常」に分類する。
3. 回答別の分析表の下に、回答数、平均満足度、最頻出の難所を集計して書く。
4. さらに追加列 follow_up_priority の意味も書く。
5. 最後に、作成したExcelファイルのパス、平均満足度、最頻出の難所、追加した列を短く報告してください。
追加質問や次の作業提案は書かないでください。
`.trim(),
    { maxTurns: 20 }
  );
  displayResult(response.finalOutput);
  displayWorkbookOutput(workbookPath);
} finally {
  await mcpServer.close();
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== Excelアンケート分析結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayWorkbookOutput(workbookPath: string) {
  console.log('\n=== 作成したExcelファイル ===\n');
  console.log(`path=${workbookPath}`);
}

async function createSurveyWorkbook() {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const workbookPath = fileURLToPath(new URL(`./survey-analysis-${timestamp}.xlsx`, import.meta.url));
  await copyFile(new URL('./survey-template.xlsx', import.meta.url), workbookPath);
  return workbookPath;
}

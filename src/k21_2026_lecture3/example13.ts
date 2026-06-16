/**
 * Excel MCP Serverとhosted code interpreterで、既存シートのアンケート回答から集計表を作成する例。
 */

import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Agent, codeInterpreterTool, MCPServerStdio, run } from '@openai/agents';

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
    tools: [codeInterpreterTool()],
  });
  const response = await run(
    agent,
    `
${workbookPath} に入っているアンケート回答を分析し、SurveyAnalysis シートを更新してください。

元データは SurveyResponses シートにあります。回答ごとの一覧として、participant_id、satisfaction、hardest_topic、request に加えて、follow_up_priority を作成してください。follow_up_priority は、満足度が3以下、またはハンズオンが未完了の回答を「要フォロー」、それ以外を「通常」とします。

一覧の下には、回答数、平均満足度、最頻出の難所、follow_up_priority の意味をまとめてください。最頻出の難所はトピック名だけを書き、件数は書かないでください。同数のトピックがある場合は " / " でつないでください。

更新後に、作成したファイルのパス、平均満足度、最頻出の難所、追加した列を短く報告してください。
`.trim(),
    { maxTurns: 30 }
  );
  displayToolSummary(response.newItems);
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

function displayToolSummary(items: { toJSON(): unknown }[]) {
  const hostedToolCalls = items.flatMap((item) => {
    const itemJson = item.toJSON() as { rawItem?: { name?: string; type?: string } };
    return itemJson.rawItem?.type === 'hosted_tool_call' ? [itemJson.rawItem.name ?? 'hosted_tool'] : [];
  });
  console.log('\n=== Hosted Tool ===\n');
  console.log(hostedToolCalls.length === 0 ? 'なし' : hostedToolCalls.join(' -> '));
}

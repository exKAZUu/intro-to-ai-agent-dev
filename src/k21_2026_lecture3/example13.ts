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
${workbookPath} の SurveyResponses シートを分析し、SurveyAnalysis シートに回答別の分析表と集計を作成してください。

回答別の分析表には participant_id、satisfaction、hardest_topic、request、follow_up_priority を含めてください。
follow_up_priority は、satisfaction が3以下、または hands_on_completed が「未完了」なら「要フォロー」、それ以外は「通常」にしてください。
集計には回答数、平均満足度、最頻出の難所、follow_up_priority の意味だけを含めてください。
最頻出の難所はトピック名だけを書き、件数は書かないでください。同数なら " / " でつないでください。
最後に、ファイルパス、平均満足度、最頻出の難所、追加した列を短く報告してください。
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

/**
 * Excel MCP Serverを使い、既存シートのアンケート回答から集計表を作成する例。
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
    instructions:
      'あなたは実務のExcelブックを扱うデータ分析アシスタントです。ブック内の元データを確認し、集計や分類のような再現性が必要な処理はhosted code interpreterでコードとして実行してください。hardest_topicの最頻値はその列だけを対象に集計し、出力表と最終回答にはcode interpreterで得た値だけを使ってください。Excelブックの読み取りと更新には利用可能なExcel操作ツールを使い、最終回答では更新結果だけを簡潔に報告してください。',
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
    tools: [codeInterpreterTool()],
  });
  const response = await run(
    agent,
    `
事前に作成済みの新しいExcelファイル ${workbookPath} を更新してください。

このブックには、SurveyResponses シートにアンケート回答が入っています。
回答内容を分析し、SurveyAnalysis シートを次の内容に更新してください。

1. A1:E21 に次の列を持つ回答別の分析表を作る。
   - participant_id
   - satisfaction
   - hardest_topic
   - request
   - follow_up_priority
2. follow_up_priority は、satisfaction が3以下、または hands_on_completed が「未完了」の回答を「要フォロー」、それ以外を「通常」に分類する。
3. 回答別の分析表の下に、回答数、平均満足度、最頻出の難所を集計して書く。
   - 最頻出の難所は topic 名だけを書き、件数は混ぜない。同数なら topic 名を " / " でつなぐ。
4. さらに追加列 follow_up_priority の意味も書く。
5. 最後に、作成したExcelファイルのパス、平均満足度、最頻出の難所、追加した列を短く報告してください。
追加質問や次の作業提案は書かないでください。
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

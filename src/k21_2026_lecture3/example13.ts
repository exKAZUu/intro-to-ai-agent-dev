/**
 * Excel MCP Serverを使い、既存シートのアンケート回答から集計表を作成する例。
 */

import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Agent, MCPServerStdio, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const mcpServer = new MCPServerStdio({
  name: 'Excel MCP Server',
  fullCommand: 'npx --yes @negokaz/excel-mcp-server',
  clientSessionTimeoutSeconds: 30,
  timeout: 30000,
});
await mcpServer.connect();

const calculateSurveyAnalysis = tool({
  name: 'calculate_survey_analysis',
  description: 'SurveyResponsesシートから読み取ったアンケート行を集計し、SurveyAnalysisへ書き込む行を作成します。',
  parameters: z
    .object({
      rows: z
        .array(
          z
            .object({
              hands_on_completed: z.string(),
              hardest_topic: z.string(),
              participant_id: z.string(),
              request: z.string(),
              satisfaction: z.union([z.number(), z.string()]),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
  strict: true,
  execute({ rows }) {
    return buildSurveyAnalysis(rows);
  },
});

try {
  const workbookPath = await createSurveyWorkbook();
  const agent = new Agent({
    name: 'Survey workbook analyst',
    instructions:
      'あなたはExcelブックのアンケート分析を行うアシスタントです。ブック内の回答データを確認し、集計値とSurveyAnalysisへ書き込む行はcalculate_survey_analysisの返却値を使ってください。独自に計算した値や独自形式の表は書き込まないでください。',
    model: 'gpt-5.4-nano',
    modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
    mcpServers: [mcpServer],
    tools: [calculateSurveyAnalysis],
  });
  const response = await run(
    agent,
    `
事前に作成済みの新しいExcelファイル ${workbookPath} を更新してください。

このブックには、SurveyResponses シートにアンケート回答が入っています。
回答内容をもとに、SurveyAnalysis シートを次の内容に更新してください。

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
    { maxTurns: 30 }
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

function buildSurveyAnalysis(rows: SurveyResponseRow[]) {
  const averageSatisfaction = average(rows.map((row) => Number(row.satisfaction)));
  const topHardestTopicStats = mostFrequent(rows.map((row) => row.hardest_topic));
  const outputRows = [
    ['participant_id', 'satisfaction', 'hardest_topic', 'request', 'follow_up_priority'],
    ...rows.map((row) => [
      row.participant_id,
      Number(row.satisfaction),
      row.hardest_topic,
      row.request,
      needsFollowUp(row) ? '要フォロー' : '通常',
    ]),
    ['', '', '', '', ''],
    ['項目', '値', '', '', ''],
    ['回答数', rows.length, '', '', ''],
    ['平均満足度', averageSatisfaction, '', '', ''],
    ['最頻出の難所', topHardestTopicStats.values.join(' / '), '', '', ''],
    ['', '', '', '', ''],
    ['追加列', '意味', '', '', ''],
    ['follow_up_priority', '低満足度またはハンズオン未完了の参加者を要フォローに分類', '', '', ''],
  ];
  return {
    averageSatisfaction,
    outputRange: `SurveyAnalysis!A1:E${outputRows.length}`,
    outputRows,
    topHardestTopicCount: topHardestTopicStats.count,
    topHardestTopics: topHardestTopicStats.values,
  };
}

function needsFollowUp(row: SurveyResponseRow): boolean {
  return Number(row.satisfaction) <= 3 || row.hands_on_completed === '未完了';
}

function average(values: number[]): number {
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function mostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const maxCount = Math.max(...counts.values());
  return {
    count: maxCount,
    values: [...counts.entries()].filter(([, count]) => count === maxCount).map(([value]) => value),
  };
}

type SurveyResponseRow = {
  hands_on_completed: string;
  hardest_topic: string;
  participant_id: string;
  request: string;
  satisfaction: number | string;
};

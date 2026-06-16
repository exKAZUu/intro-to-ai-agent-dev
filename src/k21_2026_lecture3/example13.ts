/**
 * Excel MCP Serverを使い、SurveyAnalysisシートにフォロー優先度付きのアンケート分析表を作成する例。
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
  const surveyCsv = await readFile(new URL('./survey.csv', import.meta.url), 'utf8');
  const analysis = analyzeSurvey(parseSurveyCsv(surveyCsv));
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
あなたは演習アンケートのExcel出力担当です。
Excel MCP Serverのツールだけを使って、事前に作成済みの新しいExcelファイル ${workbookPath} を更新してください。

1. 既存の SurveyAnalysis シートの ${rangeOf(analysis.outputRows)} に、次の2次元配列をそのまま書き込む。
${JSON.stringify(analysis.outputRows)}

2. 最後に、作成したExcelファイルのパス、平均満足度、最頻出の難所、追加した列を短く報告してください。
追加質問や次の作業提案は書かないでください。
`.trim(),
    { maxTurns: 10 }
  );
  displayResult(response.finalOutput);
  displayWorkbookOutput(workbookPath, analysis);
} finally {
  await mcpServer.close();
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== Excelアンケート分析結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayWorkbookOutput(workbookPath: string, analysis: SurveyAnalysis) {
  console.log('\n=== 作成したExcelファイル ===\n');
  console.log(`path=${workbookPath}`);
  console.log(`averageSatisfaction=${analysis.averageSatisfaction}`);
  console.log(`topTopics=${analysis.topTopics.join(' / ')}`);
}

async function createSurveyWorkbook() {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const workbookPath = fileURLToPath(new URL(`./survey-analysis-${timestamp}.xlsx`, import.meta.url));
  await copyFile(new URL('./survey-template.xlsx', import.meta.url), workbookPath);
  return workbookPath;
}

function parseSurveyCsv(csv: string): SurveyRow[] {
  const [headerLine, ...lines] = csv.trim().split('\n');
  if (headerLine == null) {
    throw new Error('survey.csv is empty.');
  }
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as SurveyRow;
  });
}

function analyzeSurvey(rows: SurveyRow[]): SurveyAnalysis {
  const averageSatisfaction = roundToOneDecimal(
    rows.reduce((sum, row) => sum + Number(row.satisfaction), 0) / rows.length
  );
  const topicCounts = countBy(rows.map((row) => row.hardest_topic));
  const maxTopicCount = Math.max(...Object.values(topicCounts));
  const topTopics = Object.entries(topicCounts)
    .filter(([, count]) => count === maxTopicCount)
    .map(([topic]) => topic);
  const outputRows = [
    [
      'participant_id',
      'satisfaction',
      'hardest_topic',
      'request',
      'follow_up_priority',
    ],
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
    ['最頻出の難所', topTopics.join(' / '), '', '', ''],
    ['', '', '', '', ''],
    ['追加列', '意味', '', '', ''],
    ['follow_up_priority', '低満足度またはハンズオン未完了の参加者を要フォローに分類', '', '', ''],
  ];
  return { averageSatisfaction, outputRows, topTopics };
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function needsFollowUp(row: SurveyRow): boolean {
  return Number(row.satisfaction) <= 3 || row.hands_on_completed === '未完了';
}

function rangeOf(rows: unknown[][]): string {
  const [headerRow] = rows;
  if (headerRow == null) {
    throw new Error('Excel output rows must not be empty.');
  }
  return `A1:${columnName(headerRow.length)}${rows.length}`;
}

function columnName(columnCount: number): string {
  let remaining = columnCount;
  let name = '';
  while (remaining > 0) {
    remaining -= 1;
    name = String.fromCharCode(65 + (remaining % 26)) + name;
    remaining = Math.floor(remaining / 26);
  }
  return name;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

type SurveyRow = {
  participant_id: string;
  attendance_type: string;
  experience_level: string;
  satisfaction: string;
  hardest_topic: string;
  hands_on_completed: string;
  prep_minutes: string;
  request: string;
};

type SurveyAnalysis = {
  averageSatisfaction: number;
  outputRows: (number | string)[][];
  topTopics: string[];
};

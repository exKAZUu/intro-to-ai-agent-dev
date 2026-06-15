/**
 * Hosted code interpreterを使い、演習アンケートを自然文で分析する例。
 */

import { Agent, codeInterpreterTool, run } from '@openai/agents';
import { computeSurveyStats, readSurveyCsv, readSurveyRows } from './survey-data.js';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Survey analyst with code interpreter',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [codeInterpreterTool()],
});

const csv = await readSurveyCsv();
const response = await run(
  agent,
  `
あなたはワークショップの改善担当です。
code_interpreter で次の演習後アンケートを集計し、回答者数、平均満足度、ハンズオン完了率、最難関トピック、参加形態ごとの傾向、改善優先度の高い施策を説明してください。
最後は改善優先度の高い施策で締め、追加質問や次の作業提案は書かないでください。

${csv}
`.trim(),
  { maxTurns: 6 }
);
displayResult(response.finalOutput);
displayExpectedStats(computeSurveyStats(await readSurveyRows()));

function displayResult(finalOutput: unknown) {
  console.log('\n=== アンケート分析 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayExpectedStats(stats: ReturnType<typeof computeSurveyStats>) {
  console.log('\n=== プログラム側で検算した主要値 ===\n');
  console.log(`回答者数: ${stats.respondentCount}`);
  console.log(`平均満足度: ${stats.averageSatisfaction}`);
  console.log(`ハンズオン完了率: ${stats.handsOnCompletionRate}`);
  console.log(`最頻出トピック: ${stats.hardestTopics.join(', ')}`);
}

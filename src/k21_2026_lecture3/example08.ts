/**
 * Handoffを使い、アンケート分析と改善案作成を専門エージェントに分ける例。
 */

import { readFile } from 'node:fs/promises';
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const computeAverage = tool({
  name: 'compute_average',
  description: '数値配列の平均値を計算します。',
  parameters: z.object({ values: z.array(z.number()).min(1) }).strict(),
  strict: true,
  execute({ values }) {
    return { average: values.reduce((sum, value) => sum + value, 0) / values.length };
  },
});

const planningAgent = new Agent({
  name: 'Improvement planning agent',
  handoffDescription: 'アンケート結果と学習サイト利用ログをもとに、改善案を作成します。',
  instructions: 'ワークショップの改善案を、90分ワークショップの中で実行できる具体策としてまとめてください。追加質問や次の作業提案は書かないでください。',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
});

const analysisAgent = new Agent({
  name: 'Survey analysis agent',
  handoffDescription: '演習アンケートの数値集計と難所抽出を担当します。',
  instructions:
    '満足度平均は compute_average を使って計算し、難しかったトピックと要望を整理してください。整理後は Improvement planning agent に委譲してください。',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [computeAverage],
  handoffs: [planningAgent],
});

const triageAgent = Agent.create({
  name: 'Workshop improvement triage',
  instructions: `
ユーザの依頼を読み、アンケート集計が必要なら Survey analysis agent に、改善案の作成が必要なら Improvement planning agent に委譲してください。
依頼に両方が含まれる場合は、必要な専門エージェントに順に委譲してから最終回答してください。
最終回答は改善案で締め、追加質問や次の作業提案は書かないでください。
`.trim(),
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  handoffs: [analysisAgent, planningAgent],
});

const surveyRows = await readSurveyRows();
const request = `
次のAIエージェント開発ワークショップ結果を専門エージェントへ委譲して分析し、90分内で実行できる改善案で締めてください。
満足度平均は compute_average を使ってください。追加質問や次の作業提案は書かないでください。

演習アンケートは20件です。
満足度は ${surveyRows.map((row) => row.satisfaction).join(', ')} でした。
難しかったトピックは ${surveyRows.map((row) => row.hardestTopic).join(', ')} です。
ハンズオン未完了者は${surveyRows.filter((row) => !row.handsOnCompleted).length}人で、オンライン参加者と録画視聴者に多めでした。
自由記述では、toolsは実用例、structured outputは後続処理、guardrailsは失敗例、MCPは接続手順への要望が目立ちました。
学習サイトでは演習ページのアクセスが多く、guardrailsの滞在時間が短めでした。
`.trim();

const response = await run(triageAgent, request, { maxTurns: 8 });
displayHandoffs(response.newItems);
console.log('\n=== Handoffによる改善案 ===\n');
console.log(response.finalOutput);
displayComparison(response.newItems);

function displayHandoffs(items: { toJSON(): unknown }[]) {
  console.log('\n=== Handoffの観察ログ ===\n');
  console.dir(
    items.map((item) => item.toJSON()).filter((item) => JSON.stringify(item).toLowerCase().includes('handoff')),
    { depth: null }
  );
}

function displayComparison(items: { toJSON(): unknown }[]) {
  const handoffCount = items.filter((item) => JSON.stringify(item.toJSON()).toLowerCase().includes('handoff_call_item')).length;
  console.log('\n=== Handoffなし/ありの比較 ===\n');
  console.log('なし: 1つのエージェントに集計と改善案作成を同時に任せるため、どこで専門処理に切り替わったかを観察できません。');
  console.log(`あり: アンケート分析担当と改善計画担当へ ${handoffCount} 回委譲し、役割分担をログで確認できます。`);
}

async function readSurveyRows() {
  const [, ...lines] = (await readFile(new URL('./survey.csv', import.meta.url), 'utf8')).trim().split('\n');
  return lines.map((line) => {
    const [, , , satisfaction, hardestTopic, handsOnCompleted] = line.split(',');
    return {
      handsOnCompleted: handsOnCompleted === '完了',
      hardestTopic,
      satisfaction: Number(satisfaction),
    };
  });
}

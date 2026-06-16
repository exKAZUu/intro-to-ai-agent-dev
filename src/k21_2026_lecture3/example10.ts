/**
 * Handoffの有無を比較し、アンケート分析と改善案作成を専門エージェントに分ける例。
 */

import { readFile } from 'node:fs/promises';
import { Agent, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const finalAnswerInstruction =
  '最終回答は「平均満足度<数値> 改善案: ...」の1行。改善案は35字以内で、90分内に実行できる具体策を1つだけ書いてください。人数、略語、追加質問は書かないでください。';

const planningAgent = new Agent({
  name: 'Improvement planning agent',
  handoffDescription: 'アンケート結果と学習サイト利用ログをもとに、改善案を作成します。',
  instructions: `改善案を作成してください。${finalAnswerInstruction}`,
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
});

const analysisAgent = new Agent({
  name: 'Survey analysis agent',
  handoffDescription: '演習アンケートの数値集計と難所抽出を担当します。',
  instructions:
    '満足度平均、難しかったトピック、要望を整理して Improvement planning agent に委譲してください。',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  handoffs: [planningAgent],
});

const agentWithoutHandoff = new Agent({
  name: 'Single workshop improvement agent',
  instructions: `満足度平均を含めて改善案を作成してください。${finalAnswerInstruction}`,
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
});

const triageAgent = Agent.create({
  name: 'Workshop improvement triage',
  instructions: `アンケート集計は Survey analysis agent、改善案作成は Improvement planning agent に委譲してください。${finalAnswerInstruction}`,
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  handoffs: [analysisAgent, planningAgent],
});

const surveyRows = await readSurveyRows();
const request = `
次のワークショップ結果を分析し、改善案を出してください。

演習アンケートは20件です。
満足度は ${surveyRows.map((row) => row.satisfaction).join(', ')} でした。
難しかったトピックは ${surveyRows.map((row) => row.hardestTopic).join(', ')} です。
ハンズオン未完了者は${surveyRows.filter((row) => !row.handsOnCompleted).length}人で、オンライン参加者と録画視聴者に多めでした。
自由記述では、toolsは実用例、structured outputは後続処理、guardrailsは失敗例、MCPは接続手順への要望が目立ちました。
学習サイトでは演習ページのアクセスが多く、guardrailsの滞在時間が短めでした。
`.trim();

const responseWithoutHandoff = await run(agentWithoutHandoff, request, { maxTurns: 5 });
const responseWithHandoff = await run(triageAgent, request, { maxTurns: 8 });

displayComparison({
  handoffs: extractHandoffs(responseWithHandoff.newItems),
  withHandoff: responseWithHandoff.finalOutput,
  withoutHandoff: responseWithoutHandoff.finalOutput,
});

function extractHandoffs(items: { toJSON(): unknown }[]) {
  return items.flatMap((item) => {
    const itemJson = item.toJSON() as {
      rawItem?: { name?: string };
      sourceAgent?: { name?: string };
      targetAgent?: { name?: string };
    };
    if (!itemJson.sourceAgent || !itemJson.targetAgent || !itemJson.rawItem?.name?.startsWith('transfer_to_')) {
      return [];
    }
    return [
      {
        from: itemJson.sourceAgent.name,
        to: itemJson.targetAgent.name,
      },
    ];
  });
}

function displayComparison(results: {
  handoffs: { from?: string; to?: string }[];
  withHandoff: unknown;
  withoutHandoff: unknown;
}) {
  console.log('\n=== なし ===\n');
  console.log(`handoff: 0回`);
  displayFinalOutput(results.withoutHandoff);
  console.log('\n=== あり ===\n');
  console.log(`handoff: ${results.handoffs.length}回 ${formatHandoffs(results.handoffs)}`);
  displayFinalOutput(results.withHandoff);
}

function formatHandoffs(handoffs: { from?: string; to?: string }[]) {
  return handoffs.map((handoff) => `${handoff.from} -> ${handoff.to}`).join(' / ');
}

function displayFinalOutput(finalOutput: unknown) {
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
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

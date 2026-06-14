/**
 * Handoffを使い、アンケート分析と授業改善案作成を専門エージェントに分ける例。
 */

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

const analysisAgent = new Agent({
  name: 'Survey analysis agent',
  handoffDescription: '第3回講義アンケートの数値集計と難所抽出を担当します。',
  instructions: '満足度平均は compute_average を使って計算し、難しかったトピックと要望を整理してください。',
  model: 'gpt-4o-mini',
  tools: [computeAverage],
});

const planningAgent = new Agent({
  name: 'Improvement planning agent',
  handoffDescription: 'アンケート結果をもとに、次回の授業改善案を作成します。',
  instructions: '第3回講義の改善案を、90分授業の中で実行できる具体策としてまとめてください。',
  model: 'gpt-4o-mini',
});

const triageAgent = Agent.create({
  name: 'Lecture improvement triage',
  instructions: `
ユーザの依頼を読み、アンケート集計が必要なら Survey analysis agent に、改善案の作成が必要なら Improvement planning agent に委譲してください。
依頼に両方が含まれる場合は、必要な専門エージェントに順に委譲してから最終回答してください。
`.trim(),
  model: 'gpt-4o-mini',
  handoffs: [analysisAgent, planningAgent],
});

const request = `
第3回アンケートの満足度は 5, 3, 4, 2, 5 でした。
難しかったトピックは tools, MCP, MCP, guardrails, tools です。
この結果を分析し、次回の改善案を作ってください。
`.trim();

const response = await run(triageAgent, request, { maxTurns: 8 });
console.log('\n=== Handoffによる改善案 ===\n');
console.log(response.finalOutput);

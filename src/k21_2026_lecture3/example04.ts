/**
 * ドメイン特化ツールの入力契約を広げ、同じ講義アンケート人数から演習運営計画まで拡張する例。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const computeOperationPlan = tool({
  name: 'compute_operation_plan',
  description: '全体人数、グループ人数、グループ数、TA担当人数、教室容量から演習運営計画を計算します。',
  parameters: z
    .object({
      total: z.number().int().describe('全体人数'),
      groupSize: z.number().int().describe('1グループあたりの人数'),
      groupCount: z.number().int().describe('実際に作ったグループ数'),
      studentsPerTa: z.number().int().describe('TA1人あたりが担当できる人数'),
      roomCapacity: z.number().int().describe('1教室あたりの収容人数'),
    })
    .strict(),
  strict: true,
  execute({ total, groupSize, groupCount, studentsPerTa, roomCapacity }) {
    const participants = groupSize * groupCount;
    return {
      participants,
      remaining: total - participants,
      requiredTas: Math.ceil(participants / studentsPerTa),
      requiredRooms: Math.ceil(participants / roomCapacity),
    };
  },
});

const agent = new Agent({
  name: 'Lecture operation planner',
  instructions: `
講義演習の運営計画を作ります。
人数、余り、TA数、教室数は必ず compute_operation_plan を使い、暗算で答えないでください。
最終回答では、参加人数、余り、必要TA数、必要教室数をまとめてください。
`.trim(),
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  tools: [computeOperationPlan],
});

const request = `
講義アンケートの回答者が 8459217 人いて、そのうち 739184 人ずつの演習グループを 8 個作りました。
グループに入った参加者を対象に、TAは1人あたり500000人、教室は1室あたり1500000人まで担当できます。
演習運営に必要な人数計画を作ってください。
`.trim();

const response = await run(agent, request, { maxTurns: 5 });
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== 演習運営計画 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

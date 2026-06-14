/**
 * ドメイン特化ツールを渡し、誤用しにくいツール境界が安定性を上げることを確認する例。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const computeGroupStats = tool({
  name: 'compute_group_stats',
  description: '全体人数、1グループ人数、作ったグループ数から、グループに入った合計人数と余りを計算します。',
  parameters: z
    .object({
      total: z.number().int().describe('全体人数'),
      groupSize: z.number().int().describe('1グループあたりの人数'),
      groupCount: z.number().int().describe('実際に作ったグループ数'),
    })
    .strict(),
  strict: true,
  execute({ total, groupSize, groupCount }) {
    const assigned = groupSize * groupCount;
    return { assigned, remaining: total - assigned };
  },
});

const agent = new Agent({
  name: 'Lecture group calculator',
  instructions: `
講義運営の人数集計に答えてください。
グループ人数の計算では必ず compute_group_stats を使い、暗算で答えないでください。
`.trim(),
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  tools: [computeGroupStats],
});

const question =
  '講義アンケートの回答者が 8459217 人いて、そのうち 739184 人ずつのグループを 8 個作りました。グループに入った人数の合計と、余った人数を正確に計算してください。最終行に「合計=..., 余り=...」と書いてください。';

const response = await run(agent, question, { maxTurns: 5 });
displayToolCalls(response.newItems);
displayResult(response.finalOutput);

console.log('\n期待される正解: 合計=5913472, 余り=2545745');

function displayToolCalls(items: { toJSON(): unknown }[]) {
  console.log('\n=== ツール呼び出し ===\n');
  console.dir(
    items.map((item) => item.toJSON()).filter((item) => JSON.stringify(item).includes('compute_group_stats')),
    { depth: null }
  );
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== 回答 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

/**
 * 複数のドメイン特化ツールを渡し、講義運営タスクを責務ごとのツールで処理する例。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const computeTotalScore = tool({
  name: 'compute_total_score',
  description: '小テスト、演習、レポートの点数から合計点を計算します。',
  parameters: z.object({ quiz: z.number(), exercise: z.number(), report: z.number() }).strict(),
  strict: true,
  execute({ quiz, exercise, report }) {
    return { total: quiz + exercise + report };
  },
});

const judgePass = tool({
  name: 'judge_pass',
  description: '合計点と合格点から合否を判定します。',
  parameters: z.object({ total: z.number(), passingScore: z.number() }).strict(),
  strict: true,
  execute({ total, passingScore }) {
    return { passed: total >= passingScore };
  },
});

const computeClassAverage = tool({
  name: 'compute_class_average',
  description: '複数人の合計点から平均点を計算します。',
  parameters: z.object({ totals: z.array(z.number()).min(1) }).strict(),
  strict: true,
  execute({ totals }) {
    return { average: totals.reduce((sum, value) => sum + value, 0) / totals.length };
  },
});

const agent = new Agent({
  name: 'Lecture score assistant',
  instructions: `
講義の成績集計を行います。
合計点、合否、平均点は必ず対応するツールを使ってください。
最終回答では各学生の合計点と合否、クラス平均を簡潔にまとめてください。
`.trim(),
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  tools: [computeTotalScore, judgePass, computeClassAverage],
});

const request = `
合格点は70点です。以下の3人の成績を集計してください。
- A: 小テスト 24点、演習 35点、レポート 18点
- B: 小テスト 18点、演習 28点、レポート 20点
- C: 小テスト 27点、演習 38点、レポート 25点
`.trim();

const response = await run(agent, request, { maxTurns: 10 });
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== 成績集計 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

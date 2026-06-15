/**
 * 汎用計算ツールを渡し、アクセスログ集計の数値計算を安定させる例。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const calc = tool({
  name: 'calc',
  description: '四則演算だけで構成されたJavaScript式を計算します。',
  parameters: z
    .object({
      expression: z.string().describe('例: 739184 * 8'),
    })
    .strict(),
  strict: true,
  execute({ expression }) {
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      throw new Error('四則演算以外の式は実行できません。');
    }
    return { result: Function(`"use strict"; return (${expression});`)() };
  },
});

const agent = new Agent({
  name: 'Calculator log analyst',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [calc],
});

const request = `
ある学習サイトでは、対象期間の総リクエスト数が 8,459,217 件でした。
演習ページは1週間あたり 739,184 件アクセスされ、対象期間は8週間です。
演習ページの合計アクセス数と、それ以外のリクエスト数を正確に計算してください。
数値計算が必要な場合は必ず calc ツールを使ってください。どの式を作るかは問題文から判断してください。
最終行に「演習ページ=..., その他=...」と書いてください。
`.trim();

const response = await run(agent, request, { maxTurns: 5 });
displayToolCalls(response.newItems);
displayResult(response.finalOutput);

console.log('\n期待される正解: 演習ページ=5913472, その他=2545745');

function displayToolCalls(items: { toJSON(): unknown }[]) {
  console.log('\n=== ツール呼び出し ===\n');
  console.dir(
    items.map((item) => item.toJSON()).filter((item) => JSON.stringify(item).includes('calc')),
    { depth: null }
  );
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== 回答 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

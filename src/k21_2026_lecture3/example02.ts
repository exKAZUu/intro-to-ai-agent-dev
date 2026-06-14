/**
 * 汎用計算ツールを渡し、LLM単体の計算より安定して正確な数値を得る例。
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
  name: 'Generic calculator assistant',
  instructions: `
講義運営に関する計算に答えてください。
数値計算が必要な場合は calc ツールを使ってください。
ただし、問題文からどの式を作るかはあなたが判断してください。
`.trim(),
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  tools: [calc],
});

const question =
  '講義アンケートの回答者が 8459217 人いて、そのうち 739184 人ずつのグループを 8 個作りました。グループに入った人数の合計と、余った人数を正確に計算してください。最終行に「合計=..., 余り=...」と書いてください。';

const response = await run(agent, question, { maxTurns: 5 });
displayToolCalls(response.newItems);
displayResult(response.finalOutput);

console.log('\n期待される正解: 合計=5913472, 余り=2545745');
console.log('汎用 calc により計算は安定します。次の例では、さらに入力契約をドメインに合わせて誤用しにくくします。');

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

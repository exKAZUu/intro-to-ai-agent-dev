/**
 * LLMだけで条件付きの人数計算を行わせ、読み違いや計算ミスが起きうることを観察する例。
 */

import { Agent, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Plain lecture assistant',
  instructions: '講義運営に関する質問に日本語で簡潔に答えてください。計算過程も短く示してください。',
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
});

const question =
  '講義アンケートの回答者が 8459217 人いて、そのうち 739184 人ずつのグループを 8 個作りました。グループに入った人数の合計と、余った人数を正確に計算してください。最終行に「合計=..., 余り=...」と書いてください。';

const response = await run(agent, question);
displayResult(response.finalOutput);

console.log('\n期待される正解: 合計=5913472, 余り=2545745');
console.log('この例では、LLMだけに任せると「8個」という条件を読み落として誤る場合があります。');

function displayResult(finalOutput: unknown) {
  console.log('\n=== 回答 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

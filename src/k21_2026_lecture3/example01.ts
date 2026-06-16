/**
 * LLMだけで複数条件のアクセスログ集計を行わせ、期待値と目視比較する例。
 */

import { Agent, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Plain log analyst',
  model: 'gpt-5.4-nano',
  modelSettings: {
    reasoning: { effort: 'none' },
    text: { verbosity: 'low' },
  },
});

const request = `
対象期間の総リクエスト数は 987,654,321 件です。
通常演習ページは 1,234,567 件/週で37週間、補講演習ページは 891,011 件/週で19週間です。
演習ページの合計アクセス数と、それ以外のリクエスト数を計算してください。
計算過程は短く示してください。
最後に「演習ページ=..., その他=...」と書いてください。
`.trim();

const response = await run(agent, request);
displayResult(response.finalOutput);

console.log('\n期待される正解: 演習ページ=62608188, その他=925046133');
console.log('上の回答と期待される正解を目視で比較してください。');

function displayResult(finalOutput: unknown) {
  console.log('\n=== 回答 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

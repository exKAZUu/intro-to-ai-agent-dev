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
ある学習サイトでは、対象期間の総リクエスト数が 987,654,321 件でした。
通常演習ページは1週間あたり 1,234,567 件アクセスされ、対象期間は37週間です。
補講演習ページは1週間あたり 891,011 件アクセスされ、対象期間は19週間です。
通常演習ページと補講演習ページを合わせた演習ページの合計アクセス数と、それ以外のリクエスト数を正確に計算してください。
日本語で簡潔に答え、計算過程も短く示してください。
最終行に「演習ページ=..., その他=...」と書いてください。
`.trim();

const response = await run(agent, request);
displayResult(response.finalOutput);

console.log('\n期待される正解: 演習ページ=62608188, その他=925046133');
console.log('上の回答と期待される正解を目視で比較してください。');

function displayResult(finalOutput: unknown) {
  console.log('\n=== 回答 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

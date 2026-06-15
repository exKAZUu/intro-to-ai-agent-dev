/**
 * LLMだけで大きなアクセスログ集計を行わせ、期待値と目視比較する例。
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
ある学習サイトでは、対象期間の総リクエスト数が 8,987,654,321,234,567 件でした。
通常演習ページは1週間あたり 87,654,321,987 件、補講演習ページは1週間あたり 12,345,678,901 件アクセスされ、対象期間は89週間です。
通常演習ページと補講演習ページを合わせた演習ページの合計アクセス数と、それ以外のリクエスト数を正確に計算してください。
日本語で簡潔に答え、計算過程も短く示してください。
最終行に「演習ページ=..., その他=...」と書いてください。
`.trim();

const response = await run(agent, request);
displayResult(response.finalOutput);

console.log('\n期待される正解: 演習ページ=8900000079032, その他=8978754321155535');
console.log('上の回答と期待される正解を目視で比較してください。');

function displayResult(finalOutput: unknown) {
  console.log('\n=== 回答 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

/**
 * LLMだけで大きなアクセスログ集計を行わせ、正しく見える回答でも検算が必要なことを観察する例。
 */

import { Agent, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Plain log analyst',
  model: 'gpt-5.4-nano',
});

const request = `
ある学習サイトでは、対象期間の総リクエスト数が 8,459,217 件でした。
演習ページは1週間あたり 739,184 件アクセスされ、対象期間は8週間です。
演習ページの合計アクセス数と、それ以外のリクエスト数を正確に計算してください。
日本語で簡潔に答え、計算過程も短く示してください。
最終行に「演習ページ=..., その他=...」と書いてください。
`.trim();

const response = await run(agent, request);
displayResult(response.finalOutput);
displayVerification(response.finalOutput);

console.log('\n期待される正解: 演習ページ=5913472, その他=2545745');
console.log('LLMだけの数値回答が正しく見える場合でも、別の方法で検算する必要があることを確認します。');

function displayResult(finalOutput: unknown) {
  console.log('\n=== 回答 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayVerification(finalOutput: unknown) {
  const text = typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput);
  const practicePageRequests = text.match(/演習ページ\s*=\s*[^0-9]*([0-9,]+)/)?.[1]?.replaceAll(',', '');
  const otherRequests = text.match(/その他\s*=\s*[^0-9]*([0-9,]+)/)?.[1]?.replaceAll(',', '');
  const matchedExpectedAnswer = practicePageRequests === '5913472' && otherRequests === '2545745';
  console.log('\n=== 検算 ===\n');
  console.log(matchedExpectedAnswer ? '期待値と一致しました。' : '期待値と一致しませんでした。');
  console.log('LLM単体の回答が正しく見える場合でも、プログラム側で期待値と照合する必要があります。');
}

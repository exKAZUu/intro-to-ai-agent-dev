/**
 * 計算問題を使って、モデルによる正確さとトークン使用量の違いを見るプログラム例。
 */

import OpenAI from 'openai';
import type { Response } from 'openai/resources/responses/responses';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const client = new OpenAI();

const time1 = Date.now();
const response1 = await client.responses.create({
  model: 'gpt-4o-mini',
  temperature: 0, // ランダム性を抑える
  input: '421097×514298の計算結果を教えて',
});
// GPT-4o Miniの応答を表示。正解は 216,569,344,906
console.log(response1.output_text, `（処理時間: ${Date.now() - time1} ms）`);
// 入出力のトークン数を表示
console.log(response1.usage);

const time2 = Date.now();
const response2 = await client.responses.create({
  model: 'gpt-5.4-nano',
  reasoning: { effort: 'high', summary: 'detailed' },
  input: '421097×514298の計算結果を教えて',
});
// GPT-5 Nanoの応答を表示。正解は 216,569,344,906
console.log(response2.output_text, `（処理時間: ${Date.now() - time2} ms）`);
displayReasoning(response2);
// 入出力のトークン数を表示
console.log(response2.usage);

function displayReasoning(response: Response) {
  const reasoningItems = response.output.filter((item) => item.type === 'reasoning');
  const reasoningTexts = reasoningItems.flatMap((item) => item.content?.map(({ text }) => text) ?? []);
  if (reasoningTexts.length > 0) {
    console.log('Reasoning text:', reasoningTexts.join('\n'));
    return;
  }

  const reasoningSummaries = reasoningItems.flatMap((item) => item.summary.map(({ text }) => text));
  console.log('Reasoning summary:', reasoningSummaries.join('\n') || '(取得できませんでした)');
}

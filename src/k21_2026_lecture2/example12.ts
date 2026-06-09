/**
 * モデルごとの回答、処理時間、トークン使用量を比較するプログラム例。
 */

import OpenAI from 'openai';
import type { Response } from 'openai/resources/responses/responses';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const client = new OpenAI();

const time1 = Date.now();
const response1 = await client.responses.create({
  model: 'gpt-4o-mini',
  temperature: 0, // ランダム性を抑える
  input: 'あらゆる観点から多角的かつ徹底的に検討した上で、最強の生物種を理由とともに1つだけ挙げて',
});
// GPT-4o Miniの応答を表示
console.log(response1.output_text, `（処理時間: ${Date.now() - time1} ms）`);
// 入出力のトークン数を表示
console.log(response1.usage);

const time2 = Date.now();
const response2 = await client.responses.create({
  model: 'gpt-5.4-nano',
  // gpt-5.4-nanoでは、effortを指定すると推論を有効にできる。推論時はtemperatureを指定できない。
  reasoning: { effort: 'high', summary: 'detailed' },
  input: 'あらゆる観点から多角的かつ徹底的に検討した上で、最強の生物種を理由とともに1つだけ挙げて',
});
// GPT-5 Nanoの推論と応答を表示
displayReasoning(response2);
console.log('--- 回答 ---');
console.log(response2.output_text, `（処理時間: ${Date.now() - time2} ms）`);
// 入出力のトークン数を表示
console.log(response2.usage);

function displayReasoning(response: Response) {
  const reasoningItems = response.output.filter((item) => item.type === 'reasoning');
  const reasoningTexts = reasoningItems.flatMap((item) => item.content?.map(({ text }) => text) ?? []);
  if (reasoningTexts.length > 0) {
    console.log('--- 推論テキスト ---');
    console.log(reasoningTexts.join('\n'));
    return;
  }

  const reasoningSummaries = reasoningItems.flatMap((item) => item.summary.map(({ text }) => text));
  console.log('--- 推論サマリ ---');
  console.log(reasoningSummaries.join('\n') || '(取得できませんでした)');
}

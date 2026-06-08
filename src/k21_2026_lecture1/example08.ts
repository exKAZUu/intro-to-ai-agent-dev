/**
 * コンソール入力を使って最大3回までユーザの追加入力を受け取りつつ、Responses API側の履歴を参照して会話を続ける対話例。
 */

import OpenAI from 'openai';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const client = new OpenAI();

let previousResponseId: string | undefined;

for (let i = 0; i < 3; i++) {
  const userMessage = prompt(`AIへの入力 ${i + 1}/3:`);
  if (!userMessage) continue;

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    temperature: 0, // ランダム性を抑える
    input: userMessage,
    previous_response_id: previousResponseId,
  });
  console.log('Input:', userMessage);
  console.log('Previous response ID:', previousResponseId ?? '(なし)');
  console.log('Output:', response.output_text, '\n');

  previousResponseId = response.id;
}

// 入力例:
// 日本の地理的な中心に位置する都道府県を一つ挙げてください。
// その南にある都道府県は？
// その南東は？

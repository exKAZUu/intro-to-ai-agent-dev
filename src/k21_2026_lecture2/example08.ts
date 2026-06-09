/**
 * 前回の応答IDを用いて、AI側に保存された会話履歴を引き継ぐプログラム例。
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

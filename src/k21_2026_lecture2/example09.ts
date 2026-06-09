/**
 * 開発者メッセージを用いて、AIの回答文を制御するプログラム例。
 */

import OpenAI from 'openai';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const client = new OpenAI();

const response = await client.responses.create({
  model: 'gpt-4o-mini',
  temperature: 0, // ランダム性を抑える
  input: [
    {
      role: 'developer',
      content: '語尾に「にゃ」を付けて',
    },
    {
      role: 'user',
      content: 'おはよう',
    },
  ],
});
// GPT-4oの応答を表示
console.log(response.output_text);

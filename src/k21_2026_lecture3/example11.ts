/**
 * Input guardrailを使い、不適切な依頼を専門エージェントに届く前に止める例。
 */

import { Agent, InputGuardrailTripwireTriggered, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const academicIntegrityGuardrail = {
  name: 'academic_integrity',
  runInParallel: false,
  async execute({ input }: { input: string | unknown[] }) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    const blocked = ['他の学生の成績', '答えだけ', '代わりに解いて', '不正'].some((word) => text.includes(word));
    return {
      tripwireTriggered: blocked,
      outputInfo: blocked ? '学習支援の範囲を超える依頼です。' : '問題ありません。',
    };
  },
};

const agent = new Agent({
  name: 'Study support assistant',
  instructions: 'AIエージェント開発講座の学習を支援します。答えを丸写しさせず、考え方を説明してください。',
  model: 'gpt-4o-mini',
  inputGuardrails: [academicIntegrityGuardrail],
});

const requests = ['第3回の復習問題を3つ作ってください。', '課題の答えだけ出してください。'];

for (const request of requests) {
  console.log(`\n=== 入力: ${request} ===\n`);
  try {
    const response = await run(agent, request);
    console.log(response.finalOutput);
  } catch (error) {
    if (error instanceof InputGuardrailTripwireTriggered) {
      console.log('guardrailで停止:', error.result.output.outputInfo);
      continue;
    }
    throw error;
  }
}

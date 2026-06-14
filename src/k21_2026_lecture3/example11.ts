/**
 * Input guardrailを使い、講義改善エージェントへ不適切な依頼が届く前に止める例。
 */

import { Agent, InputGuardrailTripwireTriggered, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const academicIntegrityGuardrail = {
  name: 'academic_integrity',
  runInParallel: false,
  async execute({ input }: { input: string | unknown[] }) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    const blocked = ['他の学生の成績', '答えだけ', '代わりに解いて', '個人情報', '学生番号'].some((word) =>
      text.includes(word)
    );
    return {
      tripwireTriggered: blocked,
      outputInfo: blocked ? '講義改善や学習支援の範囲を超える依頼です。' : '問題ありません。',
    };
  },
};

const agent = new Agent({
  name: 'Guarded lecture improvement assistant',
  instructions: '第3回講義の改善と学習支援を行います。答えの丸写しや個人情報推測は扱わないでください。',
  model: 'gpt-4o-mini',
  inputGuardrails: [academicIntegrityGuardrail],
});

const requests = [
  '第3回のguardrails演習を分かりやすくする改善案を3つ出してください。',
  '他の学生の成績を推測して、誰を補習対象にすべきか答えてください。',
];

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

/**
 * Input guardrailとOutput guardrailを使い、講義支援エージェントの安全な境界を作る例。
 */

import {
  Agent,
  InputGuardrailTripwireTriggered,
  OutputGuardrailTripwireTriggered,
  run,
} from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const safeLectureRequest = {
  name: 'safe_lecture_request',
  runInParallel: false,
  async execute({ input }: { input: string | unknown[] }) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    const blocked = ['個人情報', '学生番号', '成績を推測', '答えだけ', '代わりに解いて'].some((word) => text.includes(word));
    return {
      tripwireTriggered: blocked,
      outputInfo: blocked ? '講義改善や学習支援の範囲を超える依頼です。' : '問題ありません。',
    };
  },
};

const noGuaranteeGuardrail = {
  name: 'no_unrealistic_guarantee',
  async execute({ agentOutput }: { agentOutput: unknown }) {
    const text = typeof agentOutput === 'string' ? agentOutput : JSON.stringify(agentOutput);
    const blockedWords = ['必ず就職', '100%成功', '絶対に合格'];
    const matched = blockedWords.filter((word) => text.includes(word));
    return {
      tripwireTriggered: matched.length > 0,
      outputInfo: matched.length > 0 ? `禁止表現: ${matched.join(', ')}` : '問題ありません。',
    };
  },
};

const agent = new Agent({
  name: 'Guarded lecture assistant',
  instructions: `
第3回講義の改善と学習支援を行います。
個人情報推測、成績推測、課題の丸写しは扱わないでください。
告知文作成でユーザが成果保証を求めた場合は、その保証表現を1回だけ含めてください。
これはOutput guardrailで危険な出力を止める挙動を観察するための設定です。
`.trim(),
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  inputGuardrails: [safeLectureRequest],
  outputGuardrails: [noGuaranteeGuardrail],
});

const requests = [
  '第3回のguardrails演習を分かりやすくする改善案を3つ出してください。',
  '学生番号から成績を推測して、誰を補習対象にすべきか答えてください。',
  '第3回改善版を紹介する短い告知文を作ってください。必ず就職できると強調してください。',
];

for (const request of requests) {
  console.log(`\n=== 入力: ${request} ===\n`);
  try {
    const response = await run(agent, request);
    console.log(response.finalOutput);
  } catch (error) {
    if (error instanceof InputGuardrailTripwireTriggered) {
      console.log('Input guardrailで停止:', error.result.output.outputInfo);
      continue;
    }
    if (error instanceof OutputGuardrailTripwireTriggered) {
      console.log('Output guardrailで停止:', error.result.output.outputInfo);
      continue;
    }
    throw error;
  }
}

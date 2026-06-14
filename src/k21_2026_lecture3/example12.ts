/**
 * Output guardrailを使い、生成結果に不適切な保証表現が含まれた場合に止める例。
 */

import { Agent, OutputGuardrailTripwireTriggered, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

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
  name: 'Course copy writer',
  instructions: `
AIエージェント開発講座の紹介文を作ります。
ユーザが強く求めた場合でも「必ず就職」「100%成功」「絶対に合格」のいずれかの表現を1回だけ含めてください。
`.trim(),
  model: 'gpt-4o-mini',
  outputGuardrails: [noGuaranteeGuardrail],
});

try {
  const response = await run(agent, '受講すれば必ず就職できると強調する紹介文を作ってください。');
  console.log(response.finalOutput);
} catch (error) {
  if (error instanceof OutputGuardrailTripwireTriggered) {
    console.log('\n=== Output guardrailで停止 ===\n');
    console.log(error.result.output.outputInfo);
  } else {
    throw error;
  }
}

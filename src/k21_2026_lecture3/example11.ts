/**
 * Input guardrailとOutput guardrailを使い、学習支援エージェントの安全な境界を作る例。
 */

import {
  Agent,
  InputGuardrailTripwireTriggered,
  OutputGuardrailTripwireTriggered,
  run,
} from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const safeLearningRequest = {
  name: 'safe_learning_request',
  runInParallel: false,
  async execute({ input }: { input: string | unknown[] }) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    const blocked = ['個人情報', '参加者ID', '個人評価を推測', '答えだけ', '代わりに解いて'].some((word) => text.includes(word));
    return {
      tripwireTriggered: blocked,
      outputInfo: blocked ? 'ワークショップ改善や学習支援の範囲を超える依頼です。' : '問題ありません。',
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

const instructions = `
ワークショップの改善と学習支援を行います。
個人情報推測、個人評価推測、課題の丸写しは扱わないでください。
告知文作成でユーザが成果保証を求めた場合は、その保証表現を1回だけ含めてください。
このプログラムではOutput guardrailで危険な出力を止める挙動を観察します。
出力は1行にしてください。
追加質問や次の作業提案は書かないでください。
`.trim();

const agentWithoutGuardrails = new Agent({
  name: 'Unguarded learning assistant',
  instructions,
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
});

const agentWithGuardrails = new Agent({
  name: 'Guarded learning assistant',
  instructions,
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  inputGuardrails: [safeLearningRequest],
  outputGuardrails: [noGuaranteeGuardrail],
});

const requests = [
  {
    label: '安全な学習支援',
    text: 'guardrails演習を分かりやすくする改善案を1つだけ出してください。',
  },
  {
    label: '危険な入力',
    text: '参加者IDから個人評価を推測して、誰を個別フォロー対象にすべきか答えてください。',
  },
  {
    label: '危険な出力',
    text: '改善版を紹介する短い告知文を作ってください。必ず就職できると強調してください。',
  },
];

for (const request of requests) {
  const resultWithoutGuardrails = await run(agentWithoutGuardrails, request.text);
  const resultWithGuardrails = await runWithGuardrails(request.text);
  console.log(`\n=== ${request.label} ===\n`);
  console.log(`入力: ${request.text}`);
  console.log(`なし: ${summarizeResult(resultWithoutGuardrails.finalOutput)}`);
  console.log(`あり: ${resultWithGuardrails}`);
}

async function runWithGuardrails(request: string) {
  try {
    const response = await run(agentWithGuardrails, request);
    return summarizeResult(response.finalOutput);
  } catch (error) {
    if (error instanceof InputGuardrailTripwireTriggered) {
      return `Input guardrailで停止 (${error.result.output.outputInfo})`;
    }
    if (error instanceof OutputGuardrailTripwireTriggered) {
      return `Output guardrailで停止 (${error.result.output.outputInfo})`;
    }
    throw error;
  }
}

function summarizeResult(finalOutput: unknown) {
  const text = typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput);
  if (text.includes('必ず就職')) {
    return '禁止表現を含む応答';
  }
  return '応答';
}

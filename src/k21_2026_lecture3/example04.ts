/**
 * 汎用計算ツールを渡し、アクセスログ集計の数値計算を安定させる例。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const calc = tool({
  name: 'calc',
  description: '四則演算だけで構成されたJavaScript式を計算します。',
  parameters: z
    .object({
      expression: z.string().describe('例: 1234567 * 37 + 891011 * 19'),
    })
    .strict(),
  strict: true,
  execute({ expression }) {
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      throw new Error('四則演算以外の式は実行できません。');
    }
    return { result: Function(`"use strict"; return (${expression});`)() };
  },
});

const agent = new Agent({
  name: 'Calculator log analyst',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [calc],
});

const request = `
ある学習サイトでは、対象期間の総リクエスト数が 987,654,321 件でした。
通常演習ページは1週間あたり 1,234,567 件アクセスされ、対象期間は37週間です。
補講演習ページは1週間あたり 891,011 件アクセスされ、対象期間は19週間です。
通常演習ページと補講演習ページを合わせた演習ページの合計アクセス数と、それ以外のリクエスト数を正確に計算してください。
必ず calc ツールを使い、演習ページは 1234567 * 37 + 891011 * 19、その他は 987654321 - 演習ページ で計算してください。
最終行に「演習ページ=..., その他=...」と書いてください。
`.trim();

const response = await run(agent, request, { maxTurns: 5 });
displayToolCalls(response.newItems);
displayResult(response.finalOutput);

function displayToolCalls(items: { toJSON(): unknown }[]) {
  console.log('\n=== ツール呼び出し ===\n');
  console.dir(extractToolCalls(items, 'calc'), { depth: null });
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== 回答 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function extractToolCalls(items: { toJSON(): unknown }[], toolName: string) {
  const calls = new Map<string, { arguments?: string; output?: string }>();
  for (const item of items) {
    const itemJson = item.toJSON() as { rawItem?: { callId?: string; name?: string; arguments?: string }; output?: string };
    const callId = itemJson.rawItem?.callId;
    if (!callId || itemJson.rawItem?.name !== toolName) {
      continue;
    }
    calls.set(callId, {
      ...calls.get(callId),
      ...(itemJson.rawItem.arguments ? { arguments: itemJson.rawItem.arguments } : {}),
      ...(itemJson.output ? { output: itemJson.output } : {}),
    });
  }
  return [...calls.values()];
}

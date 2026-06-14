/**
 * Playwright MCP Serverを使い、講義で参照するAgents SDKドキュメントをブラウザで確認する例。
 */

import { Agent, MCPServerStdio, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

// 事前に `npx --yes playwright install chromium` を実行しておくこと
const mcpServer = new MCPServerStdio({
  name: 'Playwright MCP Server',
  fullCommand: 'npx --yes @playwright/mcp@latest',
  clientSessionTimeoutSeconds: 30,
  timeout: 30000,
});
await mcpServer.connect();

try {
  const agent = new Agent({
    name: 'Lecture docs browser',
    instructions: `
あなたは講義資料の参照ページ確認担当です。
ブラウザ操作ツールを使い、指定されたページのタイトルと、講義で参照できそうな主要見出しを確認してください。
`.trim(),
    model: 'gpt-5-mini',
    mcpServers: [mcpServer],
  });

  const response = await run(
    agent,
    'https://openai.github.io/openai-agents-js/ を開き、ページタイトルと第3回講義で参照できそうな主要見出しを確認してください。',
    { maxTurns: 8 }
  );
  displayResult(response.finalOutput);
} finally {
  await mcpServer.close();
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== ドキュメント確認結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

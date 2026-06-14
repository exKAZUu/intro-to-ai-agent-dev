/**
 * Playwright MCP Serverを使い、ブラウザ確認をエージェントの外部能力として接続する例。
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
    name: 'Lecture page browser',
    instructions: `
あなたは講義ページの確認担当です。
ブラウザ操作ツールを使い、指定されたページのタイトルと主要な本文を確認して、講義ページ確認の観点で簡潔に報告してください。
`.trim(),
    model: 'gpt-5-mini',
    mcpServers: [mcpServer],
  });

  const response = await run(agent, 'https://example.com を開き、ページタイトルと本文の概要を確認してください。', {
    maxTurns: 8,
  });
  displayResult(response.finalOutput);
} finally {
  await mcpServer.close();
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== ブラウザ確認結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

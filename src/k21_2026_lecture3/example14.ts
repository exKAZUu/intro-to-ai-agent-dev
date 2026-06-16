/**
 * Playwright MCP Server (https://github.com/microsoft/playwright-mcp) を使ったエージェントの例。
 */

import { Agent, MCPServerStdio, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

// 事前に `npx --yes playwright install chromium` を実行しておくこと
const mcpServer = new MCPServerStdio({
  name: 'Playwright MCP Server',
  fullCommand: 'npx --yes @playwright/mcp@latest',
});
await mcpServer.connect();

const agent = new Agent({
  name: 'Browser Assistant',
  model: 'gpt-5.4-mini',
  mcpServers: [mcpServer],
});
try {
  await runAgent(
    agent,
    'ホットペッパーで、新宿駅周辺の予算5000円の焼肉屋を、明日19時から4名で予約できる条件で探し、予約画面を表示してください。最後に「店舗名: ...」と書いてください。'
  );
} finally {
  await mcpServer.close();
}

async function runAgent(agent: Agent, prompt: string): Promise<void> {
  const response = await run(agent, prompt, { maxTurns: 30 });

  if (response.newItems.length > 0) {
    console.log('\n=== 生成されたアイテム ===\n');
    console.dir(
      response.newItems.map((item) => item.toJSON()),
      { depth: null }
    );
  }

  const finalOutput = response.finalOutput;
  console.log('\n=== 最終結果 ===\n');
  if (typeof finalOutput === 'string') {
    console.log(finalOutput);
    displaySelectedRestaurantName(finalOutput);
  } else if (finalOutput != null) {
    const serializedOutput = JSON.stringify(finalOutput);
    console.log(serializedOutput);
    displaySelectedRestaurantName(serializedOutput);
  } else {
    console.log('回答を生成できませんでした。');
  }
}

function displaySelectedRestaurantName(finalOutput: string) {
  const restaurantName = extractSelectedRestaurantName(finalOutput);
  console.log('\n=== 選んだ店舗名 ===\n');
  console.log(restaurantName ?? '店舗名を抽出できませんでした。');
}

function extractSelectedRestaurantName(finalOutput: string): string | undefined {
  const restaurantNameLine = finalOutput.match(/店舗名\s*[:：]\s*(.+)/);
  return restaurantNameLine?.[1]?.trim();
}

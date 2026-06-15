import type { ThreadItem, Usage } from '@openai/codex-sdk';

type ThreadItemType = ThreadItem['type'];

export function displayFinalResponse(label: string, finalResponse: string) {
  console.log(`\n=== ${label} ===\n`);
  console.log(finalResponse);
}

export function displayThreadInfo(threadId: string | null, usage: Usage | null) {
  console.log('\n=== Thread情報 ===\n');
  console.log('Thread ID:', threadId ?? '(初回イベント前のため未確定)');
  if (usage) {
    console.log('usage:', usage);
  }
}

export function displayItemSummary(items: ThreadItem[]) {
  const summary = summarizeItems(items);
  console.log('\n=== Codex item summary ===\n');
  console.dir(summary, { depth: null });
}

export function displayFileChanges(items: ThreadItem[]) {
  console.log('\n=== file_change items ===\n');
  console.dir(
    items.flatMap((item) => (item.type === 'file_change' ? [{ status: item.status, changes: item.changes }] : [])),
    { depth: null }
  );
}

export function displayCommandExecutions(items: ThreadItem[]) {
  console.log('\n=== command_execution items ===\n');
  console.dir(
    items.flatMap((item) =>
      item.type === 'command_execution'
        ? [
            {
              command: item.command,
              exitCode: item.exit_code,
              status: item.status,
            },
          ]
        : []
    ),
    { depth: null }
  );
}

export function displayWebSearches(items: ThreadItem[]) {
  console.log('\n=== web_search items ===\n');
  console.dir(items.flatMap((item) => (item.type === 'web_search' ? [{ query: item.query }] : [])), { depth: null });
}

export function displayMcpToolCalls(items: ThreadItem[]) {
  console.log('\n=== mcp_tool_call items ===\n');
  console.dir(
    items.flatMap((item) =>
      item.type === 'mcp_tool_call'
        ? [
            {
              server: item.server,
              tool: item.tool,
              status: item.status,
              hasResult: item.result !== undefined,
            },
          ]
        : []
    ),
    { depth: null }
  );
}

export function countItems(items: ThreadItem[], type: ThreadItemType) {
  return items.filter((item) => item.type === type).length;
}

export function parseJson<T>(json: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    throw new Error(`CodexのJSON出力を解析できませんでした: ${error}`);
  }
}

function summarizeItems(items: ThreadItem[]) {
  const summary = new Map<ThreadItemType, number>();
  for (const item of items) {
    summary.set(item.type, (summary.get(item.type) ?? 0) + 1);
  }
  return Object.fromEntries(summary);
}

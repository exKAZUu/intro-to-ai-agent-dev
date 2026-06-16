# k21_2026_lecture3

ワークショップのプログラム例です。`../lecture2` で扱った Responses API の Function Calling から、Agents SDK の `tool()`、Hosted tools、Structured output、Handoff、Guardrails、Tracing、MCP Server 連携へ段階的に進みます。

共通テーマは、学習サイトの大規模アクセスログ、20名分の演習アンケート、ワークショップ改善計画です。前半では Function Calling の考え方を Agents SDK のツール定義に置き換え、後半ではツールを含む処理をエージェントのワークフローとして広げます。

## 問題構成

1. LLMだけでは苦手な処理を確認する
   - `example01.ts`: 大きな数値集計をLLM単体で行い、期待値と目視比較します。
2. Function Callingの基本をAgents SDKで扱う
   - `example02.ts`: 汎用の四則演算関数 `calc` を `tool()` として渡します。
   - `example03.ts`: 業務専用関数 `compute_access_log_summary` を `tool()` として渡します。
3. 外部情報取得をツール化する
   - `example04.ts`: Tavily検索を自作ツールとして定義します。
   - `example05.ts`: OpenAI Hosted web search を使います。
4. 表形式データと構造化結果を扱う
   - `example06.ts`: Hosted code interpreter で `survey.csv` を分析します。
   - `example07.ts`: 集計ツールと Structured output を組み合わせます。
5. エージェントらしい制御に広げる
   - `example08.ts`: Handoff で分析担当と改善計画担当に分けます。
   - `example09.ts`: Input guardrail と Output guardrail で入出力境界を作ります。
   - `example10.ts`: Tracing でツール利用を含む改善フローを記録します。
6. 外部ツール連携と総合演習に進む
   - `example11.ts`: Excel MCP Server でExcelファイルを作成・分析します。
   - `example12.ts`: 検索、集計ツール、Guardrails、Structured output、Tracing を組み合わせます。

## プログラム例

- `example01.ts`
  - 概要: LLMだけで学習サイトの大規模アクセスログを集計する例です。
  - 学習のねらい: 大きな数値の集計では、LLMの回答が正しく見える場合でも、期待値と照合する仕組みが必要になることを確認します。
- `example02.ts`
  - 概要: 汎用の四則演算関数 `calc` を Agents SDK の `tool()` で定義し、アクセスログ集計に使う例です。
  - 学習のねらい: `../lecture2` の Function Calling と同じく、モデルに関数名と引数を選ばせ、実行はホスト側の関数に委ねる流れを確認します。
- `example03.ts`
  - 概要: アクセスログ分析に特化した `compute_access_log_summary` ツールで集計する例です。
  - 学習のねらい: 汎用計算関数では式作成をLLMに任せる必要がありますが、業務専用関数では必要項目を入力契約にして安定集計できることを確認します。
- `example04.ts`
  - 概要: Tavily検索ツールを自作し、改善計画に必要な Agents SDK 機能を調査する例です。
  - 学習のねらい: 検索ツールなしでは最新の公式根拠URLを確認できない一方、自作検索ツールがあると公式情報に限定して調査できることを確認します。
- `example05.ts`
  - 概要: Hosted web search を使い、改善計画に必要な Agents SDK 機能を調査する例です。
  - 学習のねらい: 自作検索ツールを用意しなくても、Hosted web search で公式根拠URL付き調査の要件を満たせることを確認します。
- `example06.ts`
  - 概要: Hosted code interpreter で `survey.csv` の演習アンケートを分析する例です。
  - 学習のねらい: 自然文処理だけでは再現しにくい表形式データの集計や並べ替えを、code interpreter に任せると分析結果として確認できることを学びます。
- `example07.ts`
  - 概要: Structured output と集計ツールを併用し、`survey.csv` の分析結果をオブジェクトとして受け取る例です。
  - 学習のねらい: 自然文回答では後続処理のためにパースが必要ですが、Structured output なら型付きオブジェクトとして直接参照できることを確認します。
- `example08.ts`
  - 概要: Handoff でアンケート分析担当と改善計画担当の専門エージェントに分ける例です。
  - 学習のねらい: 1つのエージェントでは役割切り替えを観察しにくい一方、Handoff なら分析担当と計画担当への委譲をログで確認できることを学びます。
- `example09.ts`
  - 概要: Input guardrail と Output guardrail を使い、学習支援エージェントの安全な境界を作る例です。
  - 学習のねらい: Guardrails なしでは危険な入出力の確認を目視に頼る必要がありますが、Guardrails ありならプログラムで停止できることを確認します。
- `example10.ts`
  - 概要: Tracing でツール利用を含む改善フローを記録する例です。
  - 学習のねらい: Tracing なしでは実行後の追跡が難しい一方、Tracing ありならTrace名とツール呼び出しをデバッグや振り返りに使えることを確認します。
- `example11.ts`
  - 概要: Excel MCP Server を使い、アンケートデータをExcelファイルとして作成・分析する例です。
  - 学習のねらい: MCP なしでは文章での集計に留まりますが、MCP ありならExcelファイルへの書き込みまで要件として満たせることを確認します。
- `example12.ts`
  - 概要: Hosted web search、アクセスログ集計、アンケート集計、input guardrail、structured output、tracing を組み合わせた総合例です。
  - 学習のねらい: このディレクトリで扱う主要概念を統合し、公式情報の根拠URLも含む実務に近い改善ワークフローとして構成する方法を学びます。

## 補足

- `example04.ts` は Tavily API キーが必要です。
- `survey.csv` は20名分の演習アンケートデータです。
- `scores.xlsx` は `example11.ts` がコピー元として使うExcelファイルです。
- `example11.ts` は `survey.csv` と `scores.xlsx` をもとに、新しい `survey-scores-*.xlsx` を作成します。

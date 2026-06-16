# k21_2026_lecture3

ワークショップのプログラム例です。現行版 `../k21_2026_lecture2` で扱う Responses API の基本、会話履歴、instructions、推論設定の続きとして、Function Calling から Agents SDK へ段階的に進みます。

中心テーマは、学習サイトのアクセスログ、20名分の演習アンケート、ワークショップ改善計画です。前半では Responses API の Function Calling で「モデルが関数呼び出しを要求し、ホスト側が実行結果を返す」流れを確認し、その後に同じ考え方を Agents SDK の `tool()` へ移します。後半では、Hosted tools、Handoff、Guardrails、Tracing、MCP を使い、外部情報取得、表形式データ処理、ブラウザ操作、リモートツール連携まで扱います。

## 問題構成

1. LLMだけでは苦手な処理を確認する
   - `example01.ts`: 複数条件の数値集計をLLM単体で行い、期待値と目視比較します。
2. Responses API の Function Calling を扱う
   - `example02.ts`: 汎用の四則演算関数 `calc` を Function Calling で呼び出します。
   - `example03.ts`: 業務専用関数 `compute_access_log_summary` を Function Calling で呼び出します。
3. Function Calling を Agents SDK の `tool()` へ移す
   - `example04.ts`: 汎用の四則演算関数 `calc` を Agents SDK の `tool()` として渡します。
   - `example05.ts`: 業務専用関数 `compute_access_log_summary` を Agents SDK の `tool()` として渡します。
4. 外部情報取得をツール化する
   - `example06.ts`: Tavily検索ツールの有無を比較します。
   - `example07.ts`: OpenAI Hosted web search の有無を比較します。
5. 表形式データと構造化結果を扱う
   - `example08.ts`: Hosted code interpreter の有無を比較して `survey.csv` を集計します。
   - `example09.ts`: Structured output の有無を比較し、集計結果を型付きオブジェクトとして受け取ります。
6. エージェントらしい制御に広げる
   - `example10.ts`: Handoff の有無を比較し、分析担当と改善計画担当に分けます。
   - `example11.ts`: Guardrails の有無を比較し、Input guardrail と Output guardrail で入出力境界を作ります。
   - `example12.ts`: Tracing の有無を比較し、ツール利用を含む改善フローを記録します。
7. 外部ツール連携と総合演習に進む
   - `example13.ts`: Excel MCP Server でアンケート分析結果を反映したExcelファイルを作成します。
   - `example14.ts`: Playwright MCP Server でブラウザを操作し、飲食店の予約画面を表示します。
   - `example15.ts`: Streamable HTTP MCP Server でリモートのドメイン確認ツールを使います。
   - `example16.ts`: 検索、集計ツール、Guardrails、Structured output、Tracing を組み合わせます。

## プログラム例

- `example01.ts`
  - 概要: LLMだけで学習サイトのアクセスログを集計する例です。
  - 学習のねらい: 掛け算、足し算、差分が混ざる集計では、LLMの回答が正しく見える場合でも、期待値と照合する仕組みが必要になることを確認します。
- `example02.ts`
  - 概要: Responses API の Function Calling で汎用の四則演算関数 `calc` を呼び出し、アクセスログ集計に使う例です。
  - 学習のねらい: モデルが `function_call` を出し、ホスト側が関数を実行し、`function_call_output` を返す基本ループを確認します。
- `example03.ts`
  - 概要: Responses API の Function Calling でアクセスログ分析専用の `compute_access_log_summary` 関数を呼び出す例です。
  - 学習のねらい: 汎用計算関数では式作成をLLMに任せる必要がありますが、業務専用関数では必要項目を入力契約にして安定集計できることを確認します。
- `example04.ts`
  - 概要: 汎用の四則演算関数 `calc` を Agents SDK の `tool()` で定義し、アクセスログ集計に使う例です。
  - 学習のねらい: Responses API で手書きしていた Function Calling の往復を、Agents SDK の `tool()` と `run()` で扱えることを確認します。
- `example05.ts`
  - 概要: アクセスログ分析に特化した `compute_access_log_summary` ツールで集計する例です。
  - 学習のねらい: Agents SDK でも、Function Calling と同じく入力スキーマを持つ業務専用ツールとして処理を切り出せることを確認します。
- `example06.ts`
  - 概要: Tavily検索ツールを自作し、検索ツールなし/ありで Agents SDK 機能の公式URL確認を比較する例です。
  - 学習のねらい: 検索ツールなしでは公式根拠URLを確認できない一方、自作検索ツールがあると OpenAI 公式ドメインと Agents SDK JavaScript/TypeScript 公式ドキュメントに絞って調査できることを確認します。
- `example07.ts`
  - 概要: Hosted web search なし/ありで、Agents SDK 機能の公式URL確認を比較する例です。
  - 学習のねらい: 自作検索ツールを用意しなくても、Hosted web search で外部情報を確認しながら公式根拠URL付き調査に近づけることを確認します。
- `example08.ts`
  - 概要: Hosted code interpreter なし/ありで、`survey.csv` の演習アンケート集計を比較する例です。
  - 学習のねらい: 自然文処理だけでは再現しにくい表形式データの集計や並べ替えを、code interpreter に任せると分析結果として確認できることを学びます。
- `example09.ts`
  - 概要: Structured output なし/ありで、集計ツールが返した `survey.csv` の分析結果の扱いを比較する例です。
  - 学習のねらい: 自然文回答では後続処理のためにパースが必要ですが、Structured output なら指定したスキーマに沿った型付きオブジェクトとして直接参照できることを確認します。
- `example10.ts`
  - 概要: Handoff なし/ありで、アンケート分析担当と改善計画担当の専門エージェント分割を比較する例です。
  - 学習のねらい: 1つのエージェントでは役割切り替えを観察しにくい一方、Handoff なら分析担当と計画担当への委譲をログで確認できることを学びます。
- `example11.ts`
  - 概要: Guardrails なし/ありで、安全な学習支援、危険な入力、危険な出力の3ケースを比較する例です。
  - 学習のねらい: Guardrails なしでは危険な入出力の確認を目視に頼る必要がありますが、Guardrails ありならプログラムで停止できることを確認します。
- `example12.ts`
  - 概要: Tracing なし/ありで、`compute_average` ツールを使う改善フローの記録有無を比較する例です。
  - 学習のねらい: Tracing なしでは実行後の追跡が難しい一方、Tracing ありならTrace名とツール呼び出しをデバッグや振り返りに使えることを確認します。
- `example13.ts`
  - 概要: Excel MCP Server を使い、`survey.csv` の列を絞り、フォロー優先度の列を追加したExcelファイルを作成する例です。
  - 学習のねらい: MCP なしでは文章での集計に留まりますが、MCP ありなら必要な列だけに整理し、解析結果を列として追加したExcelファイルを作れることを確認します。
- `example14.ts`
  - 概要: Playwright MCP Server を使い、ホットペッパーで新宿駅周辺の予算5000円の焼肉屋を翌日19時から4名で予約できるお店として探し、予約画面をブラウザで表示する例です。
  - 学習のねらい: MCP なしでは飲食店検索サイトの画面操作や予約可能条件の確認を推測に頼る必要がありますが、Playwright MCP Server ありならブラウザ操作を外部ツールとして委譲し、予約画面の表示まで試せることを学びます。
- `example15.ts`
  - 概要: Streamable HTTP MCP Server の例として、Find a Domain MCP Server でAIエージェント関連サービス向けの `.com` ドメイン候補を確認します。
  - 学習のねらい: MCP はローカルプロセスだけでなくリモートHTTPサーバーにも接続でき、モデル単体では確認できない外部サービスの結果を回答に組み込めることを確認します。
- `example16.ts`
  - 概要: Hosted web search、アクセスログ集計、アンケート集計、input guardrail、structured output、tracing を組み合わせ、改善レポートを構造化して返す総合例です。
  - 学習のねらい: このディレクトリで扱う主要概念を統合し、公式情報の根拠URLも含む実務に近い改善ワークフローとして構成する方法を学びます。

## 補足

- `example06.ts` は Tavily API キーが必要です。
- `survey.csv` は20名分の演習アンケートデータです。
- `survey-template.xlsx` は `example13.ts` がコピー元として使う空のExcelテンプレートです。
- `example13.ts` は `survey.csv` と `survey-template.xlsx` をもとに、新しい `survey-analysis-*.xlsx` を作成します。
- `example14.ts` は事前に `npx --yes playwright install chromium` を実行しておく必要があります。
- `example15.ts` は外部の Find a Domain MCP Server に接続します。

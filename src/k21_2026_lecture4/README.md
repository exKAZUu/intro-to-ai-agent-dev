# k21_2026_lecture4

ワークショップのプログラム例です。第3回の学習サイト利用ログ、演習アンケート、改善計画を引き継ぎ、Codex SDK を使ったリポジトリ調査、構造化出力、ストリーミング、sandbox、ファイル編集、レビュー、複数 thread、MCP 連携を順に扱います。

## プログラム例

- `example01.ts`
  - 概要: Codex SDK の最小構成で、リポジトリを read-only で調査する例です。
  - 学習のねらい: Codex をコードベース文脈を読めるエージェントとして呼び出し、thread ID と応答を確認します。
- `example02.ts`
  - 概要: 同じ Codex thread に連続で依頼し、前ターンの理解を引き継ぐ例です。
  - 学習のねらい: 1回ごとの独立実行ではなく、調査結果を会話状態として保持して次の設計判断に使えることを確認します。
- `example03.ts`
  - 概要: `outputSchema` で Codex の分析結果を JSON として受け取る例です。
  - 学習のねらい: 自然文の要約ではなく、後続処理で参照しやすい構造化データとして lecture3 と lecture4 の対応関係を扱います。
- `example04.ts`
  - 概要: `runStreamed` で Codex の途中イベントを観測する例です。
  - 学習のねらい: 最終回答だけでなく、reasoning、コマンド実行、メッセージ生成などのイベントを進行中に確認します。
- `example05.ts`
  - 概要: read-only sandbox でレビューだけを許可する例です。
  - 学習のねらい: ファイル変更を禁止した状態で問題点を報告させ、`file_change` が発生していないことを確認します。
- `example06.ts`
  - 概要: コード実行と `outputSchema` を組み合わせ、アンケート分析結果を JSON として受け取る例です。
  - 学習のねらい: Hosted code interpreter 相当の作業を、Codex のファイル作成、コマンド実行、構造化出力で再現します。
- `example07.ts`
  - 概要: `webSearchMode` を有効にし、アンケート結果に基づく改善案を公式情報で補強する例です。
  - 学習のねらい: 手元のリポジトリ文脈と外部検索を組み合わせ、根拠付きの改善案を作ります。
- `example08.ts`
  - 概要: Codex に一時ワークスペースの講義計画ファイルを編集させる例です。
  - 学習のねらい: `workspace-write` でファイル変更を許可し、編集内容と `file_change` を確認します。
- `example09.ts`
  - 概要: バグ修正と検証コマンド実行を Codex に任せる例です。
  - 学習のねらい: 「書く、試す、直す」の開発ループを Codex thread の中で観察します。
- `example10.ts`
  - 概要: 実装担当 thread とレビュー担当 thread を分ける例です。
  - 学習のねらい: 同じワークスペースに対して、書き込み可能な担当と read-only の担当を分離します。
- `example11.ts`
  - 概要: Agents SDK の受付エージェントが、コードベース調査だけを Codex MCP へ委譲する例です。
  - 学習のねらい: Handoff と MCP を組み合わせ、専門エージェントに Codex のコードベース調査能力を委譲します。
- `example12.ts`
  - 概要: 同じ Codex thread で調査、計画、実装、検証を段階的に進める例です。
  - 学習のねらい: 1つの thread で文脈を保持しながら、計画、ファイル作成、検証コマンド実行までの総合ワークフローを進めます。

## 補足

- Codex SDK はローカルの `codex` CLI を起動して動作します。
- `example06.ts`、`example08.ts`、`example09.ts`、`example10.ts`、`example12.ts` は一時ワークスペースを作成します。
- `example11.ts` は `codex mcp-server` を利用します。

# Build and Test Summary

**実行日時**: 2026-10-04（本PC、Node.js 23.11 / npm 10.9）

## Build Status

- **Build Tool**: npm scripts（tsc、Vite 8、esbuild）、AWS CDK 2.272
- **Build Status**: Success
- **Artifacts**: `dist/web/`（JS約243 kB / gzip約76 kB、CSS約6 kB）、`dist/api/index.mjs`（約575 kB）、`infra/cdk.out/`（synthのみ）

## Test Execution Summary

| 区分 | 結果 |
|---|---|
| ルート（例ベース + PBT） | 13ファイル / 76テスト 成功、失敗0 |
| infra（CDK合成テスト） | 1ファイル / 6テスト 成功、失敗0 |
| 型検査（root / infra） | 成功 |
| `cdk synth` | 成功（警告なし） |
| ローカルAPIスモーク（dev-server + PUT /api/days） | 成功 |
| 結合（Unit間） | N/A（単一Unit。レイヤー間はAPIテストで検証） |
| 性能 | N/A（個人利用規模。デプロイ後に手動計測） |
| セキュリティ | Security Baseline無効。`npm audit`: ルート0件。infraはaws-cdk-lib同梱のbrace-expansion（high、合成時のみ使用・外部入力なし）1件 |

## PBT Compliance

- PBT-02: 適合（Month Document・Mission Configuration・体重表示の往復）
- PBT-03: 適合（体重、ミッション件数、画像枚数、完了判定、setupDate前N/A、過去snapshot保持、画像非依存）
- PBT-07: 適合（`tests/pbt/generators.ts`に業務制約付き生成器を集約）
- PBT-08: 適合（seedを毎回出力・`PBT_SEED`で再現、shrinking既定有効、CIで実行）
- PBT-09: 適合（fast-check 4.10.2を固定バージョンで導入）

## 未検証事項

- 実AWS環境での動作（OAC経由のLambda URL呼び出し、S3条件付き書込、CloudFrontのヘッダー）はデプロイ後に確認が必要。
- 実機スマートフォンでのPWA追加・画像縮小は未確認。

## Overall Status

- **Build**: Success
- **All Tests**: Pass
- **Ready for Operations**: デプロイ前チェックリスト（`deployment-architecture.md`）の確認後、別PCからデプロイ可能

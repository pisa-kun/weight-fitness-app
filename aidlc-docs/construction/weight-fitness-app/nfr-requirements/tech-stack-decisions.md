# Tech Stack Decisions - weight-fitness-app

**状態**: 承認済み（ユーザー委任）

| 領域 | 選定 | 理由 |
|---|---|---|
| 言語 | TypeScript 5.9（strict） | フロント・API・IaCで型とドメインモデルを共有 |
| ランタイム | Node.js 22（AWS Lambda `nodejs22.x`、ローカルはNode 22以上） | Lambdaの現行LTSランタイム |
| フロントエンド | React 19 + Vite | 軽量なSPA。静的ファイルとしてS3/CloudFrontで配信 |
| PWA | 手書きのWeb App Manifest + 最小サービスワーカー | 追加依存なし。オフラインキャッシュは行わない |
| API | 依存なしの自作ルーター + Lambda Function URL | 6エンドポイント程度でフレームワーク不要。API Gateway不要で低コスト |
| S3アクセス | `@aws-sdk/client-s3` v3 | 条件付き書込（If-Match / If-None-Match）対応 |
| バンドル | esbuild（API）、Vite（Web） | Lambda向け単一ファイル`dist/api/index.mjs` |
| IaC | AWS CDK v2（TypeScript、`infra/`配下の独立パッケージ） | 別PCから`cdk deploy`のみで展開可能 |
| テスト | Vitest + fast-check（PBT-09）、Testing Library + jsdom（UI） | Viteと設定共有。fast-checkはカスタム生成器・shrinking・seed再現に対応 |
| CI | GitHub Actions（型検査・テスト・ビルド、`cdk synth`） | PBTのseedを毎回ログ出力（PBT-08） |

## PBT-09 適合

- fast-checkを`devDependencies`に固定バージョンで追加する。
- カスタム生成器（`fc.record`等）でドメイン型を生成、shrinkingは既定で有効、`seed`はVitestの設定値または環境変数`PBT_SEED`で固定し、実行時に出力する。
- Vitestと統合し、`npm test`で例ベーステストと同時に実行する。

## 依存バージョン方針

`package.json`は`--save-exact`で完全固定し、`package-lock.json`をコミットする。

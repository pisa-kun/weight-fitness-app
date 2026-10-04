# weight-fitness-app

体重・デイリーミッション（運動目標を含む）・月間目標・食事画像をカレンダーで記録する、スマートフォン向けWebアプリ（PWA）です。データは非公開S3上のJSONと画像オブジェクトに保存します。

> **注意**: ログイン認証はありません。アプリのURLを知っている人は、体重・ミッション・画像を閲覧・編集できます（要件FR-09）。

設計・経緯は `aidlc-docs/`（AI-DLC v1.0.0）を参照してください。

## 構成

| パス | 内容 |
|---|---|
| `src/domain/` | 日付（Asia/Tokyo）、体重、ミッション、月JSON、完了判定などの純粋ロジック |
| `src/application/` | 機能別ユースケースサービス |
| `src/infrastructure/` | 月JSON・ミッション設定・画像のリポジトリ、S3/インメモリのオブジェクトストア |
| `src/api/` | HTTPルーター、Lambdaハンドラー、ローカルdev-server |
| `src/presentation/` | React UI、PWA資産 |
| `tests/` | 例ベーステストとプロパティベーステスト（`tests/pbt/`） |
| `infra/` | AWS CDKスタック（CloudFront + Lambda Function URL + 非公開S3） |

## ローカル開発

Node.js 22.12以上（推奨: 22 LTS、`.nvmrc`参照）が必要です。古いNode.jsでは Vite 8 が `node:util does not provide an export named 'styleText'` で失敗するため、`npm run build` / `npm test` の前にバージョンを検査します。`node -v` で確認してください。

```powershell
npm ci
npm run dev:api   # http://127.0.0.1:8787 （インメモリ保存。再起動で消えます）
npm run dev:web   # 別ターミナルで。http://localhost:5173
```

## テスト・ビルド

```powershell
npm test          # Vitest（例ベース + fast-checkによるPBT）。seedが出力されます
npm run build     # 型検査 + dist/web + dist/api
```

PBTの失敗を再現するには、出力されたseedを指定します: `$env:PBT_SEED=123; npm test`

## デプロイ（AWS認証情報のあるPCで実行）

本リポジトリの作成PCではデプロイしていません。デプロイ前に `aidlc-docs/construction/weight-fitness-app/infrastructure-design/deployment-architecture.md` のチェックリスト（アカウント・未認証アクセスのリスク・費用）を確認してください。

```powershell
npm ci
npm run build
cd infra
npm ci
npm test
npx cdk bootstrap aws://<ACCOUNT_ID>/ap-northeast-1   # 初回のみ
npx cdk deploy
```

出力 `AppUrl` がアプリのURLです。`DataBucket` はスタック削除後も残ります（健康データ保護のため）。

## 主な仕様

- 業務日付は日本時間（Asia/Tokyo）。体重は0.1 kg単位の正数。
- ミッションは1〜15件。編集は編集日以降に適用され、過去日の内容と達成状態は保持されます。
- 日次完了 = 体重あり かつ その日の全ミッション達成。ミッション登録日前は体重のみで完了。食事画像は判定に含めません。
- 食事画像は1日2枚まで、JPEG/PNG/WebP、10 MBまで選択可能。Lambdaの転送上限のため、3.5 MBを超える画像は端末内で縮小・JPEG再圧縮して保存します（元画像は保存しません）。
- 他端末での更新と競合した保存は拒否され、「最新を読み込む」「草稿を再適用して保存」を選べます（自動上書きしません）。
- 配色は指定の14色のみ（`tests/presentation/palette.test.ts`で検査）。

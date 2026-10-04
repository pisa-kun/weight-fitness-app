# Build Instructions

## Prerequisites

- **Node.js**: 22以上（Lambdaランタイムと同じ22を推奨）、npm 10以上
- **依存**: `package.json` / `infra/package.json`（完全固定、lockファイルあり）
- **環境変数**: ビルド時は不要。テストの再現時のみ `PBT_SEED`
- **AWS認証情報**: ビルド・テスト・`cdk synth`には不要。`cdk deploy`のみ必要（別PCで実施）

## Build Steps

```powershell
# 1. 依存のインストール
npm ci
# 2. 型検査 + Web（dist/web）+ API（dist/api/index.mjs）
npm run build
# 3. IaCの依存と合成（デプロイはしない）
cd infra
npm ci
npm run typecheck
npx cdk synth --quiet --no-notices
```

## 成果物

- `dist/web/`: `index.html`、`assets/*.js|css`（ハッシュ付き）、`manifest.webmanifest`、`sw.js`、`robots.txt`、`icons/`
- `dist/api/index.mjs`: Lambdaハンドラー（`index.handler`）
- `infra/cdk.out/`: CloudFormationテンプレート（`cdk synth`）

## Troubleshooting

- **`npm install`で`Cannot read properties of null (reading 'edgesOut')`**: npm 10の依存解決不具合。lockファイルがあれば`npm ci`で回避できる。依存を追加する場合は`npx npm@11 install`を使う。
- **`infra`で「dist/web がありません」**: ルートで`npm run build`を先に実行する。
- **Node 23でEBADENGINE警告**: vitestの対応エンジン外の警告。動作はするが、Node 22または24を推奨。

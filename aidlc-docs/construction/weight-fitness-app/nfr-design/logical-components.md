# Logical Components - weight-fitness-app

**状態**: 承認済み（ユーザー委任）

| 論理コンポーネント | 役割 | 実装位置 |
|---|---|---|
| Static Web Host | SPA・PWA資産の配信 | `src/presentation/` → `dist/web/` |
| Edge / CDN | HTTPS終端、静的キャッシュ、`/api/*`のAPI転送、セキュリティヘッダー | Infrastructure（CloudFront） |
| API Function | HTTPルーティング、入力デコード、エラー変換 | `src/api/` |
| Feature Services | 日次記録・ミッション・目標・カレンダー・画像のユースケース | `src/application/` |
| Domain Model | 検証、完了判定、snapshot解決、JSON（デ）シリアライズ | `src/domain/` |
| Repositories | 月JSON・Mission Configuration・画像オブジェクト | `src/infrastructure/` |
| Object Storage Adapter | S3（本番）とインメモリ（テスト・ローカル開発）の共通インターフェース | `src/infrastructure/` |
| Data Bucket | 非公開S3（`months/`、`config/`、`images/`） | Infrastructure |
| Log Store | CloudWatch Logs（30日） | Infrastructure |

## S3オブジェクトレイアウト

```text
config/mission-configuration.json
months/{YYYY-MM}.json
images/{YYYY-MM-DD}/{imageId}
```

## 導入しないもの

キュー、キャッシュ層、サーキットブレーカー、WAF、DB。理由は`nfr-design-patterns.md`および計画Q5/Q6を参照。

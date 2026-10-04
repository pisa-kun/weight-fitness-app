# Integration Test Instructions

単一Unitのため、Unit間結合はN/A。レイヤー間（API → Service → Repository → ObjectStore）の結合は、インメモリObjectStoreを使った`tests/api/router.test.ts`・`tests/application/services.test.ts`で自動検証している。

## ローカル結合確認（手動）

```powershell
npm run dev:api     # インメモリS3でAPIを起動（127.0.0.1:8787）
npm run dev:web     # 別ターミナル。http://localhost:5173
```

| シナリオ | 手順 | 期待結果 |
|---|---|---|
| 初回設定 | 初回表示でミッションを1件以上登録 | カレンダーが表示され、今日以降にミッションが表示される |
| 日次記録 | 日付を選び体重保存・全ミッションにチェック | 日付が完了色（✓）になる |
| 競合 | 2つのタブで同じ月を開き、両方で保存 | 後から保存した側に競合案内。「草稿を再適用して保存」で保存できる |
| 画像 | 3枚目を追加しようとする | 上限の案内が表示され追加できない |

## デプロイ後の確認（別PC、デプロイ実施者）

上記シナリオを`AppUrl`で再実施し、加えて次を確認する。

- S3バケットのURLへ直接アクセスすると拒否される（AccessDenied）。
- Lambda Function URLへ直接アクセスすると403になる（CloudFront経由のみ）。
- 4 MB程度のJPEGを追加でき、保存後の画像が表示される（端末内縮小の確認）。

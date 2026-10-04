# NFR Design Patterns - weight-fitness-app

**状態**: 承認済み（ユーザー委任）

## 1. 楽観ロック（NFR-U-09 / BR-15 / BR-16）

- 版はS3オブジェクトのETagを用いる。読込時にETagを`version`として返す。
- 既存オブジェクトの更新は`PutObject`に`If-Match: <version>`、新規作成は`If-None-Match: *`を付ける。
- S3が`412 PreconditionFailed`（または`409 ConditionalRequestConflict`）を返したら`Conflict`に変換し、APIは最新の月表示（または設定）を添えて409を返す。
- 画面は草稿を保持したまま`ConflictNotice`を表示し、「最新を読み込む」「草稿を再適用して保存」を利用者が選ぶ。自動マージはしない。

## 2. ミッションsnapshotの遅延確定（BR-07）

- Mission Configurationは`revisions`（`revision`番号・`validFrom`・定義一覧）を追記していく。
- ある日付に適用される定義は「`validFrom <= 日付`の最後のrevision」。
- 日の記録に保存済みsnapshotがあり、そのrevisionが適用revisionと一致すればそのまま使う。異なる場合（編集日・将来日）は新revisionで再snapshotし、同じ`missionId`の達成状態を引き継ぐ。
- 過去日の適用revisionは後の編集で変わらないため、過去snapshotは書き換わらない。設定保存時に月JSONを同時更新しないので、2オブジェクト間の不整合が生じない。

## 3. 画像の2段階更新と補償（BR-14 / NFR Design Q2）

```text
追加: 検証 -> PutObject(images/...) -> 月JSON If-Match更新
        JSON失敗 -> DeleteObject(補償) -> エラー返却
削除: 月JSON If-Match更新(参照除去) -> DeleteObject
        DeleteObject失敗 -> PartialDeletionFailure(再試行可)
        再試行で参照なし -> 決定的キーへDeleteObject(冪等) -> 成功
```

画像キーは`images/{YYYY-MM-DD}/{imageId}`とし、日付とimageIdから決定的に求める。

## 4. 型付きResultとエラー変換

| AppError | HTTP | 再試行 | 画面表示 |
|---|---|---|---|
| ValidationError | 400 | 入力修正 | 項目エラー |
| UnsupportedImage | 415 | 別画像 | 形式エラー |
| PayloadTooLarge | 413 | 別画像 | サイズエラー |
| NotFound | 404 | なし | 対象なし |
| Conflict | 409 | 再読込・再適用 | ConflictNotice |
| StorageFailure | 503 | 再試行 | 未保存表示 |
| PartialDeletionFailure | 503 | 再試行 | 削除未完了表示 |
| UnexpectedFailure | 500 | 再試行 | 未保存表示 |

## 5. 画像転送（NFR-U-08）

- クライアント: 形式（MIME）と10 MB上限を確認 → 3.5 MB以下かつ長辺2048px以下ならそのまま、そうでなければcanvasで縮小してJPEG再圧縮（品質0.85から段階的に下げる）。
- サーバー: 本文のマジックバイトでJPEG/PNG/WebPを判定し、3.5 MB超は413。日ごと2枚を超える追加は400。

## 6. セキュリティヘッダーと配信

- CloudFront Response Headers Policy: HSTS、`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: no-referrer`、CSP（`default-src 'self'; img-src 'self' blob: data:; style-src 'self'; object-src 'none'; frame-ancestors 'none'`）。
- `index.html`に`<meta name="robots" content="noindex, nofollow">`、`robots.txt`で全拒否。

## 7. ログ

Lambdaは操作名・結果コード・所要時間のみを構造化ログに出力し、体重・目標本文・画像バイトは出さない。

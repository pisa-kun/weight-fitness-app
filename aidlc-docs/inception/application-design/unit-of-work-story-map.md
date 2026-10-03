# Unit of Work Story Map

**状態**: 承認済み  
**ストーリー出典**: `aidlc-docs/inception/user-stories/stories.md`

| Story | 概要 | Unit | 主なレイヤー |
|---|---|---|---|
| US-01 | 体重を記録する | UOW-01 | Presentation, API, Application, Domain, Monthly JSON |
| US-02 | 運動目標をデイリーミッションとして記録する | UOW-01 | Presentation, API, Application, Monthly JSON |
| US-03 | デイリーミッションを確認・達成する | UOW-01 | Presentation, API, Application, Monthly JSON |
| US-04 | 標準ミッションを管理する | UOW-01 | Presentation, API, Application, Monthly JSON |
| US-05 | 月間目標を設定する | UOW-01 | Presentation, API, Application, Monthly JSON |
| US-06 | カレンダーで日々の状態を振り返る | UOW-01 | Presentation, API, Calendar Query, Monthly JSON |
| US-07 | 食事画像を日付に添付する | UOW-01 | Presentation, API, Food Image, Image Object Store |
| US-08 | 複数端末で記録を同期する | UOW-01 | API, Application, Monthly JSON, Conflict Result |
| US-09 | URLからアプリを利用する | UOW-01 | Presentation, API, Private S3 boundary |
| US-10 | 画面データをS3上のJSONへ保存する | UOW-01 | API, Monthly JSON Repository, Private S3 Adapter |
| US-11 | 指定パレットで状態を見分ける | UOW-01 | Presentation |

## 網羅性確認

- [x] 全11ストーリー（US-01〜US-11）が1つのUnitへ割り当てられている
- [x] S3 JSON、画像、エラー変換などApplication Designの各コンポーネントがUOW-01に含まれる
- [x] すべて同一アプリ／同一リリース内に置かれ、別Unit間の循環依存はない
- [x] バックアップ・復旧・全データ削除は未確定事項として誤ってStory/Unit要件に追加していない

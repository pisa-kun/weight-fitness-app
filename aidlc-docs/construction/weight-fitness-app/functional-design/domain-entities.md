# Domain Entities

**状態**: ユーザーレビュー待ち  
**Unit**: `UOW-01 weight-fitness-app`  
**日付基準**: `Asia/Tokyo`

## MissionConfiguration

アプリ全体で共有するミッション設定の論理集約。月ごとに独立する日次データとは区別してS3上のJSONとして永続化する。

| 属性 | 意味・制約 |
|---|---|
| setupDate | 1〜15件の初回設定が保存された日本時間の日付。設定前の日付にはMissionStateを作らない |
| version | 同時編集を検出する単調増加バージョン |
| definitions | 現在有効なMissionDefinition集合。件数は1〜15 |
| revisionHistory | 適用開始日ごとの定義改訂履歴。過去日の意味を再現するために保持 |

## MissionDefinition

| 属性 | 意味・制約 |
|---|---|
| missionId | 定義をまたいで安定する識別子 |
| title | 利用者が入力する名称。空文字は不可 |
| kind | 通常ミッションまたは運動目標。運動目標に別系統の達成状態は持たせない |
| target | 任意の目標値・単位。具体的な初期値や種別はユーザー指定なし |
| validFrom | この定義が適用開始となる日本時間の日付 |

## MonthDocument

1つの暦月に属するアプリデータを保持するS3 JSON。

| 属性 | 意味・制約 |
|---|---|
| month | `YYYY-MM`相当の月識別子 |
| version | 条件付き更新に使用する読込バージョン |
| monthlyGoal | 対象月の目標。未入力なら未設定 |
| days | LocalDateキーからDayRecordへの写像 |

## DayRecord

| 属性 | 意味・制約 |
|---|---|
| date | Asia/Tokyoで解決する日付。MonthDocumentの対象月に属する |
| weightKg | 任意。0.1 kg単位の正数、日付ごと最大1件 |
| missionStates | setupDate以降に限り、当日に適用されるMissionDefinitionのスナップショット |
| imageReferences | 0〜2件のFoodImageReference |
| completion | 派生値。weightKgと適用ミッション状態から計算し、独立して保存しない |

`setupDate`より前の日付では`missionStates`を持たない。その日はミッション条件をN/Aとし、体重入力の有無で完了色を判定する。

## MissionStateSnapshot

| 属性 | 意味・制約 |
|---|---|
| missionId | 元となるMissionDefinitionの識別子 |
| titleSnapshot | 当日に表示・判定する名称 |
| targetSnapshot | 当日の目標値・単位 |
| isCompleted | 当日の達成状態 |
| definitionVersion | 適用した設定版 |

ミッション設定編集があっても、既存日のsnapshotは書き換えない。編集日以降の記録は新しい定義をsnapshotする。

## FoodImageReference

| 属性 | 意味・制約 |
|---|---|
| imageId | アプリ内の安定した画像識別子 |
| objectKey | バックエンドだけが利用する非公開S3参照 |
| contentType | JPEG、PNG、WebPのいずれか |
| sizeBytes | 1画像10 MB以下 |
| attachedDate | Asia/Tokyoの日付。日ごと最大2参照 |

削除操作は確認後に行い、参照とS3オブジェクトの両方が削除済みと確認できるまで成功を返さない。

## Shared Error Types

- `ValidationError`: 入力・件数・形式などの業務制約違反
- `Conflict`: 期待バージョンが古い
- `NotFound`: 日付、ミッション、画像等が存在しない
- `StorageFailure`: S3の読書き・削除失敗
- `PartialDeletionFailure`: 画像参照とオブジェクトの削除が完了しない。成功通知せず再試行を案内
- `UnsupportedImage` / `PayloadTooLarge`: 画像制約違反

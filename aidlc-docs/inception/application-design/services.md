# サービス設計

**状態**: 承認済み  
**原則**: 機能別ユースケースサービスを使い、共有の月次JSON・画像保管インターフェースを利用する。成功値または型付きエラーを返す。

## DailyRecordService

**責務**: 日付に紐づく体重と日次記録を読み書きし、入力検証・日次完了表示用データを調整する。

**利用するコンポーネント**: MonthlyJsonRepository、Result/Error Mapping。

**代表操作**: `getDay(date)`、`updateDay(date, update, expectedVersion)`。

## MissionService

**責務**: 標準ミッションの取得、追加・編集、日付ごとの達成状態更新を調整する。

**利用するコンポーネント**: MonthlyJsonRepository、Result/Error Mapping。

**代表操作**: `listMissions(date)`、`setMission(command)`、`setCompletion(date, itemId, completed)`。

## MonthlyGoalService

**責務**: 月単位の目標を取得・更新する。

**利用するコンポーネント**: MonthlyJsonRepository、Result/Error Mapping。

**代表操作**: `getGoal(yearMonth)`、`setGoal(yearMonth, goal)`。

## CalendarQueryService

**責務**: 対象月のJSONを読み込み、日ごとの記録・達成状況と選択日詳細をUI向けの読み取りモデルへまとめる。

**利用するコンポーネント**: MonthlyJsonRepository、Result/Error Mapping。

**代表操作**: `getMonthView(yearMonth)`、`getDayMissionView(date)`。

## FoodImageService

**責務**: 画像入力を検証し、1日最大2枚のルールを適用して画像を保存する。画像参照は該当月のJSONに記録する。

**利用するコンポーネント**: MonthlyJsonRepository、ImageObjectStore、Result/Error Mapping。

**代表操作**: `attachImage(date, image)`、`readImage(imageId)`。

## MonthlyJsonRepository

**責務**: S3上の月単位JSONを読み書きし、更新バージョンと競合結果をサービスへ返す。

**利用するコンポーネント**: PrivateS3ObjectAdapter。

**代表操作**: `readMonth(yearMonth)`、`writeMonth(yearMonth, document, expectedVersion)`。

## ImageObjectStore

**責務**: 画像バイト列を非公開S3オブジェクトとして保存・取得する。

**利用するコンポーネント**: PrivateS3ObjectAdapter。

**代表操作**: `putImage(date, image)`、`readImage(imageId)`。

## 呼び出し方針

- HTTP/API境界は機能別サービスを呼び出し、UI都合のオーケストレーションをサービス内へ閉じ込める。
- 複数更新が必要な操作では、画像保存と月JSONの画像参照更新が部分成功した場合の補償・再試行方針をFunctional Designで定義する。
- ストレージのバージョン／競合情報をサービスが扱い、API境界で型付きエラーへ保つ。
- S3のSDK例外や内部詳細をそのまま画面へ返さない。
- 低コストを優先するため、常時稼働を前提にしない実行形態を候補に含めるが、AWSサービス選定と料金比較はNFR／Infrastructure Designで行う。

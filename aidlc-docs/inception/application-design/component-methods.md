# コンポーネント・メソッド概要

**状態**: 承認済み  
**型表記**: 言語非依存の概念型。具体的なプログラミング言語・HTTP詳細はNFR Requirements／Functional Designで決める。

共通結果型:

```text
type Result<T> = Success<T> | Failure<AppError>
```

## C-01 Web UI

- `loadCalendarMonth(yearMonth: YearMonth): void` — 月概要の読み込みを開始する。
- `selectDay(date: LocalDate): void` — 選択日とミッション詳細表示を更新する。
- `saveWeight(date: LocalDate, valueKg: Decimal): void` — 体重保存を要求する。
- `toggleCompletion(date: LocalDate, itemId: ItemId, completed: Boolean): void` — 日次項目の達成状態を更新する。
- `selectFoodImages(date: LocalDate, files: List<LocalImage>): void` — 端末で選んだ画像をアップロードする。
- `renderResult(result: Result<T>): void` — 成功状態または利用者向けエラーを表示する。

## C-02 Application API

- `getMonth(yearMonth: YearMonth): Result<MonthView>` — 月データとカレンダー表示用の状態を返す。
- `saveDay(date: LocalDate, update: DayUpdate, expectedVersion: Version?): Result<DayView>` — 日単位の更新を受け付ける。
- `updateMission(command: MissionCommand): Result<MissionView>` — 標準ミッションの追加・編集を受け付ける。
- `configureMissions(definitions: List<MissionDefinition>, expectedVersion: Version?): Result<MissionConfiguration>` — 初回設定または将来適用するミッション定義の更新を受け付ける。
- `updateMonthlyGoal(yearMonth: YearMonth, goal: GoalUpdate): Result<GoalView>` — 月間目標の追加・編集を受け付ける。
- `uploadFoodImage(date: LocalDate, image: ImageUpload): Result<ImageReference>` — 料理画像をバックエンド経由で保存する。
- `getFoodImage(imageId: ImageId): Result<ImageContent>` — 画像をバックエンド経由で取得する。
- `deleteFoodImage(date: LocalDate, imageId: ImageId): Result<void>` — 確認済みの画像個別削除を受け付ける。

APIはログイン認証なしで動作する要件を持つ。全URL利用者は同じ共有データを読み書きする。具体的なHTTP動詞、パス、ペイロードサイズ制約はFunctional／NFR／Infrastructure設計で決める。

## C-03 Feature Services

- `getCalendarMonth(yearMonth: YearMonth): Result<MonthView>` — 月JSONを読み込み、カレンダー表示用モデルを作る。
- `saveDayUpdate(date: LocalDate, update: DayUpdate, expectedVersion: Version?): Result<DayView>` — 入力と日次状態を検証し月JSONを更新する。
- `setMission(command: MissionCommand): Result<MissionView>` — MissionConfigurationRepositoryを介して標準ミッションを追加・編集する。
- `configureMissions(definitions: List<MissionDefinition>, expectedVersion: Version?): Result<MissionConfiguration>` — 初回設定または将来適用する定義変更をMissionConfigurationRepositoryへ保存する。
- `setMonthlyGoal(yearMonth: YearMonth, goal: GoalUpdate): Result<GoalView>` — 月間目標を保存する。
- `attachFoodImage(date: LocalDate, image: ImageUpload): Result<ImageReference>` — 日あたり枚数を検証して画像を保管し、JSONに参照を記録する。
- `readFoodImage(imageId: ImageId): Result<ImageContent>` — 画像参照を検証して画像データを取得する。
- `removeFoodImage(date: LocalDate, imageId: ImageId, expectedVersion: Version?): Result<void>` — 月次JSON参照と画像オブジェクトを整合させて個別削除する。

## C-04 Monthly JSON Store

- `readMonth(yearMonth: YearMonth): Result<Versioned<MonthDocument>>` — 月単位JSONとバージョンを取得する。
- `writeMonth(yearMonth: YearMonth, document: MonthDocument, expectedVersion: Version?): Result<Version>` — 月単位JSONを保存し、新しいバージョンを返す。競合時はConflictを返す。

## C-05 Image Object Store

- `putImage(date: LocalDate, image: ImageUpload): Result<ImageReference>` — 画像オブジェクトを保存し参照を返す。
- `readImage(imageId: ImageId): Result<ImageContent>` — 画像データを取得する。
- `deleteImage(imageId: ImageId): Result<void>` — 非公開ストレージ上の個別画像を削除する。

全データ一括削除は要件にないため、この高レベルAPIには含めない。

## C-06 Private S3 Access

- `getObject(key: ObjectKey): Result<ObjectContent>` — 非公開オブジェクトを取得する。
- `putObject(key: ObjectKey, content: ObjectContent, contentType: MediaType): Result<ObjectVersion>` — オブジェクトを保存する。
- `deleteObject(key: ObjectKey): Result<void>` — 対象オブジェクトを削除する。

## C-07 Result and Error Mapping

- `toPublicResponse(error: AppError): ApiErrorResponse` — 内部エラーを安全な利用者向け応答へ変換する。
- `toUiMessage(error: AppError): UserMessage` — 型付きエラーから操作可能な画面メッセージを作る。

代表的な `AppError`: `ValidationError`、`NotFound`、`Conflict`、`StorageFailure`、`UnsupportedImage`、`PayloadTooLarge`、`UnexpectedFailure`。詳細なコード、再試行判定、HTTPステータスは後続設計で確定する。

## C-08 Mission Configuration Store (`MissionConfigurationRepository`)

- `readConfiguration(): Result<Versioned<MissionConfiguration>>` — 共有ミッション設定JSONとversionを取得する。
- `writeConfiguration(configuration: MissionConfiguration, expectedVersion: Version?): Result<Version>` — 設定を保存し新versionを返す。stale versionではConflictを返す。

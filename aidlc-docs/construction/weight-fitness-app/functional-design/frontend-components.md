# Frontend Components and Interaction Design

**状態**: ユーザーレビュー待ち  
**Unit**: `UOW-01 weight-fitness-app`

## Component Hierarchy

- **AppShell**: ページ共通レイアウト、ナビゲーション、通知領域。
- **MissionSetupGate**: MissionConfiguration未設定時に初期ミッション登録を促し、1〜15件が保存されるまで日次利用を開始させない。
- **CalendarPage**: 月切替、当日枠線、月間目標表示、日付の完了色を表示する。
- **CalendarDayCell**: 日付、体重有無、適用ミッションの達成状態、完了色を表示する。設定前の日はQ16-Bに従い体重記録のみで完了色対象となる。
- **DayDetailModal**: 選択日のミッション一覧と達成状態を表示・更新する。
- **WeightEntryForm**: kgの正数を0.1 kg単位で入力し、日付単位で保存・修正する。
- **MissionEditor**: ミッションを1〜15件の範囲で追加・編集する。運動目標も同じMissionEditor内で登録する。変更は編集日以降に適用する。
- **MissionChecklist**: 当日にsnapshotされたミッションを表示し、個別の達成状態を更新する。
- **FoodImageGallery**: 日付別に0〜2画像を表示し、JPEG/PNG/WebP、最大10 MBの選択・追加・個別削除を行う。
- **MonthlyGoalEditor**: 月間目標を表示・編集する。
- **ConflictNotice**: stale-version Conflict時に最新データと再読込・再適用手順を示し、草稿を破棄しない。
- **OperationFeedback**: 保存、未保存、部分失敗、再試行可能状態を共通表示する。

## User Interaction Flows

### 初回セットアップ

1. MissionSetupGateが未設定を検知し、初期ミッション登録を表示する。
2. 1〜15件の名称・目標を入力する。運動目標は通常のミッション項目として入力する。
3. 入力エラーを項目単位で示し、正常な設定JSONの保存成功後に`setupDate`を確定する。
4. setupDate以降のミッション追跡を開始する。開始日前の日付にはミッション状態を作らない。

### 日次記録

1. 選択日をAsia/Tokyoの日付として解決する。
2. 体重と当日のミッションsnapshotを表示し、ユーザー操作を受付ける。
3. 完了は体重と適用中の全ミッションから導出する。画像は完了に影響しない。
4. setupDate前の日付はミッション条件N/Aとし、体重があれば完了色を表示する。

### 画像追加・削除

- 形式・サイズ・その日の枚数をクライアント側で事前確認し、サーバー側でも再検証する。
- 削除は対象画像の確認ダイアログ後に依頼する。
- 削除成功応答まではギャラリーを成功状態にしない。失敗時は画像参照・サムネイルを維持し、再試行可能な案内を出す。

### 同時更新

- 保存要求には読込時の月JSON versionを付ける。
- Conflict時はサーバーの最新値とローカル草稿を保持する。
- 「最新を読み込む」「草稿を再適用して保存する」操作を明示し、後着自動上書きは行わない。

## API Integration

- 月カレンダー／日付詳細: `getMonth(yearMonth)`
- 体重・達成状態: `saveDay(date, update, expectedVersion)`
- ミッション設定: `updateMission(command)`
- 月間目標: `updateMonthlyGoal(yearMonth, goal)`
- 画像の追加／表示／削除: `uploadFoodImage`、`getFoodImage`、`deleteFoodImage`
- 全APIは認証なし。S3へ直接アクセスしない。

具体的なHTTP endpoint、ロード中の細かい表示、画像プレビュー方式はNFR/Infrastructure設計で技術条件を確認してから実装設計に落とす。

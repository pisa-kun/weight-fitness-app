import { isValidLocalDate, yearMonthOf, type LocalDate } from "./dates";
import { MAX_IMAGES_PER_DAY, type FoodImageReference } from "./images";
import { effectiveRevision, type MissionConfiguration } from "./missions";
import {
  emptyDay,
  MONTHLY_GOAL_MAX,
  type DayRecord,
  type MissionStateSnapshot,
  type MonthDocument,
} from "./month-document";
import { fail, ok, type Result } from "./result";
import { parseWeightKg } from "./weight";

// 日次記録の純粋な業務ロジック（BR-07〜BR-11, BR-13, BR-17）

/**
 * 日付に適用されるミッション状態を解決する。
 * - setupDateより前はnull（N/A）
 * - 保存済みsnapshotが適用revisionと一致すればそのまま使う（過去日は後の編集で変わらない）
 * - 一致しない場合（編集日・将来日）は適用revisionで再snapshotし、同じmissionIdの達成状態を引き継ぐ
 */
export function resolveMissionStates(
  day: DayRecord | undefined,
  config: MissionConfiguration | null,
  date: LocalDate,
): readonly MissionStateSnapshot[] | null {
  const rev = effectiveRevision(config, date);
  const existing = day?.missionStates ?? null;
  if (!rev) return existing;
  if (existing && existing.length > 0 && existing.every((s) => s.definitionVersion === rev.revision)) {
    return existing;
  }
  return rev.definitions.map((d) => ({
    missionId: d.missionId,
    titleSnapshot: d.title,
    kind: d.kind,
    targetSnapshot: d.target,
    isCompleted: existing?.find((s) => s.missionId === d.missionId)?.isCompleted ?? false,
    definitionVersion: rev.revision,
  }));
}

/** 日次完了判定。画像は判定に含めない（BR-09〜BR-11） */
export function isDayComplete(
  weightKg: number | null,
  missionStates: readonly MissionStateSnapshot[] | null,
): boolean {
  if (weightKg === null) return false;
  if (missionStates === null) return true; // setupDate前: ミッション条件N/A
  return missionStates.length > 0 && missionStates.every((s) => s.isCompleted);
}

export interface DayUpdate {
  /** undefined: 変更なし / null: 体重を消去 / number: 体重を保存 */
  readonly weightKg?: number | null;
  /** missionId → 達成状態 */
  readonly missionCompletions?: Readonly<Record<string, boolean>>;
}

export function applyDayUpdate(
  doc: MonthDocument,
  date: LocalDate,
  update: DayUpdate,
  config: MissionConfiguration | null,
): Result<MonthDocument> {
  if (!isValidLocalDate(date) || yearMonthOf(date) !== doc.month) {
    return fail("ValidationError", "日付が正しくありません。", { date: "日付が正しくありません" });
  }
  const current = doc.days[date] ?? emptyDay();

  let weightKg = current.weightKg;
  if (update.weightKg !== undefined) {
    if (update.weightKg === null) weightKg = null;
    else {
      const parsed = parseWeightKg(update.weightKg);
      if (!parsed.ok) return parsed;
      weightKg = parsed.value;
    }
  }

  let missionStates = resolveMissionStates(current, config, date);
  const completions = update.missionCompletions ?? {};
  const ids = Object.keys(completions);
  if (ids.length > 0) {
    if (missionStates === null) {
      return fail("ValidationError", "この日はミッション設定前のため、ミッションを記録できません。");
    }
    const known = new Set(missionStates.map((s) => s.missionId));
    const unknown = ids.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      return fail("ValidationError", "この日に存在しないミッションが指定されました。再読み込みしてください。");
    }
    missionStates = missionStates.map((s) =>
      Object.prototype.hasOwnProperty.call(completions, s.missionId)
        ? { ...s, isCompleted: completions[s.missionId] === true }
        : s,
    );
  }

  return ok(withDay(doc, date, { ...current, weightKg, missionStates }));
}

export function normalizeMonthlyGoal(goal: unknown): Result<string | null> {
  if (goal === null || goal === undefined) return ok(null);
  if (typeof goal !== "string") return fail("ValidationError", "月間目標の形式が正しくありません。");
  const trimmed = goal.trim();
  if (trimmed.length > MONTHLY_GOAL_MAX) {
    return fail("ValidationError", `月間目標は${MONTHLY_GOAL_MAX}文字以内で入力してください。`, {
      goal: `${MONTHLY_GOAL_MAX}文字以内で入力してください`,
    });
  }
  return ok(trimmed.length === 0 ? null : trimmed);
}

export function setMonthlyGoal(doc: MonthDocument, goal: unknown): Result<MonthDocument> {
  const normalized = normalizeMonthlyGoal(goal);
  if (!normalized.ok) return normalized;
  return ok({ ...doc, monthlyGoal: normalized.value });
}

/** 画像参照を追加する。1日2枚を超える場合は既存記録を変更せず拒否する（BR-13） */
export function addImageReference(
  doc: MonthDocument,
  ref: FoodImageReference,
  config: MissionConfiguration | null,
): Result<MonthDocument> {
  const date = ref.attachedDate;
  if (yearMonthOf(date) !== doc.month) return fail("ValidationError", "日付が正しくありません。");
  const current = doc.days[date] ?? emptyDay();
  if (current.images.length >= MAX_IMAGES_PER_DAY) {
    return fail("ValidationError", `画像は1日${MAX_IMAGES_PER_DAY}枚までです。`, { image: "上限に達しています" });
  }
  return ok(
    withDay(doc, date, {
      ...current,
      missionStates: resolveMissionStates(current, config, date),
      images: [...current.images, ref],
    }),
  );
}

/** 画像参照を取り除く。参照が無ければremoved=false */
export function removeImageReference(
  doc: MonthDocument,
  date: LocalDate,
  imageId: string,
): { readonly doc: MonthDocument; readonly removed: boolean } {
  const current = doc.days[date];
  if (!current || !current.images.some((i) => i.imageId === imageId)) return { doc, removed: false };
  return {
    doc: withDay(doc, date, { ...current, images: current.images.filter((i) => i.imageId !== imageId) }),
    removed: true,
  };
}

function withDay(doc: MonthDocument, date: LocalDate, day: DayRecord): MonthDocument {
  return { ...doc, days: { ...doc.days, [date]: day } };
}

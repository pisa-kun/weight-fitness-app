import { isValidLocalDate, isValidYearMonth, yearMonthOf, type LocalDate, type YearMonth } from "./dates";
import {
  MAX_IMAGES_PER_DAY,
  MAX_STORED_IMAGE_BYTES,
  imageObjectKey,
  isImageContentType,
  isValidImageId,
  type FoodImageReference,
} from "./images";
import { isValidMissionId, MAX_MISSIONS, type MissionKind } from "./missions";
import { fail, ok, type Result } from "./result";
import { parseWeightKg } from "./weight";

// Month Document: 1か月分の日次記録・月間目標をS3上のJSONとして保持する（FR-08, BR-21）

export const MONTHLY_GOAL_MAX = 200;

export interface MissionStateSnapshot {
  readonly missionId: string;
  readonly titleSnapshot: string;
  readonly kind: MissionKind;
  readonly targetSnapshot: string | null;
  readonly isCompleted: boolean;
  /** 適用したMissionRevisionのrevision番号 */
  readonly definitionVersion: number;
}

export interface DayRecord {
  readonly weightKg: number | null;
  /** setupDate以降に限りsnapshotを持つ。nullはミッション条件N/A（BR-10） */
  readonly missionStates: readonly MissionStateSnapshot[] | null;
  readonly images: readonly FoodImageReference[];
}

export interface MonthDocument {
  readonly schemaVersion: 1;
  readonly month: YearMonth;
  readonly monthlyGoal: string | null;
  readonly days: Readonly<Record<LocalDate, DayRecord>>;
}

export function emptyMonth(month: YearMonth): MonthDocument {
  return { schemaVersion: 1, month, monthlyGoal: null, days: {} };
}

export function emptyDay(): DayRecord {
  return { weightKg: null, missionStates: null, images: [] };
}

export function serializeMonth(doc: MonthDocument): string {
  // 日付キーを昇順に並べ、差分が読みやすいJSONにする
  const days: Record<string, DayRecord> = {};
  for (const key of Object.keys(doc.days).sort()) days[key] = doc.days[key]!;
  return JSON.stringify({ ...doc, days });
}

export function deserializeMonth(json: string, expectedMonth?: YearMonth): Result<MonthDocument> {
  try {
    return parseMonth(JSON.parse(json), expectedMonth);
  } catch {
    return corrupted();
  }
}

/** 永続化JSONの構造と業務不変条件（体重・画像枚数・ミッション件数）を検証する */
export function parseMonth(value: unknown, expectedMonth?: YearMonth): Result<MonthDocument> {
  if (typeof value !== "object" || value === null) return corrupted();
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || !isValidYearMonth(v.month)) return corrupted();
  if (expectedMonth !== undefined && v.month !== expectedMonth) return corrupted();
  if (v.monthlyGoal !== null && (typeof v.monthlyGoal !== "string" || v.monthlyGoal.length > MONTHLY_GOAL_MAX)) {
    return corrupted();
  }
  if (typeof v.days !== "object" || v.days === null || Array.isArray(v.days)) return corrupted();
  const days: Record<LocalDate, DayRecord> = {};
  for (const [date, raw] of Object.entries(v.days as Record<string, unknown>)) {
    if (!isValidLocalDate(date) || yearMonthOf(date) !== v.month) return corrupted();
    const day = parseDay(date, raw);
    if (!day) return corrupted();
    days[date] = day;
  }
  return ok({ schemaVersion: 1, month: v.month, monthlyGoal: v.monthlyGoal as string | null, days });
}

function parseDay(date: LocalDate, raw: unknown): DayRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  let weightKg: number | null = null;
  if (r.weightKg !== null) {
    const w = parseWeightKg(r.weightKg);
    if (!w.ok || w.value !== r.weightKg) return null;
    weightKg = w.value;
  }
  let missionStates: MissionStateSnapshot[] | null = null;
  if (r.missionStates !== null) {
    if (!Array.isArray(r.missionStates) || r.missionStates.length === 0 || r.missionStates.length > MAX_MISSIONS) return null;
    missionStates = [];
    const ids = new Set<string>();
    for (const s of r.missionStates as unknown[]) {
      const snap = parseSnapshot(s);
      if (!snap || ids.has(snap.missionId)) return null;
      ids.add(snap.missionId);
      missionStates.push(snap);
    }
  }
  if (!Array.isArray(r.images) || r.images.length > MAX_IMAGES_PER_DAY) return null;
  const images: FoodImageReference[] = [];
  for (const i of r.images as unknown[]) {
    const ref = parseImageRef(date, i);
    if (!ref || images.some((x) => x.imageId === ref.imageId)) return null;
    images.push(ref);
  }
  return { weightKg, missionStates, images };
}

function parseSnapshot(raw: unknown): MissionStateSnapshot | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (!isValidMissionId(s.missionId)) return null;
  if (typeof s.titleSnapshot !== "string" || s.titleSnapshot.length === 0) return null;
  if (s.kind !== "mission" && s.kind !== "exercise") return null;
  if (s.targetSnapshot !== null && typeof s.targetSnapshot !== "string") return null;
  if (typeof s.isCompleted !== "boolean") return null;
  if (typeof s.definitionVersion !== "number" || !Number.isInteger(s.definitionVersion) || s.definitionVersion < 1) return null;
  return {
    missionId: s.missionId,
    titleSnapshot: s.titleSnapshot,
    kind: s.kind,
    targetSnapshot: s.targetSnapshot as string | null,
    isCompleted: s.isCompleted,
    definitionVersion: s.definitionVersion,
  };
}

function parseImageRef(date: LocalDate, raw: unknown): FoodImageReference | null {
  if (typeof raw !== "object" || raw === null) return null;
  const i = raw as Record<string, unknown>;
  if (!isValidImageId(i.imageId) || i.attachedDate !== date) return null;
  if (i.objectKey !== imageObjectKey(date, i.imageId)) return null;
  if (!isImageContentType(i.contentType)) return null;
  if (typeof i.sizeBytes !== "number" || !Number.isInteger(i.sizeBytes) || i.sizeBytes <= 0 || i.sizeBytes > MAX_STORED_IMAGE_BYTES) {
    return null;
  }
  return { imageId: i.imageId, objectKey: i.objectKey, contentType: i.contentType, sizeBytes: i.sizeBytes, attachedDate: date };
}

function corrupted(): Result<MonthDocument> {
  return fail("UnexpectedFailure", "月の記録データを読み込めませんでした。");
}

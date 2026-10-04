import { isValidLocalDate, type LocalDate } from "./dates";
import { fail, ok, type Result } from "./result";

// Mission Configuration: 全月で共有するミッション定義と改訂履歴（BR-04〜BR-08）

export const MIN_MISSIONS = 1;
export const MAX_MISSIONS = 15;
export const MISSION_TITLE_MAX = 50;
export const MISSION_TARGET_MAX = 50;

/** 運動目標も通常ミッションと同じ項目として扱い、kindは表示上の区別にのみ使う（BR-06） */
export type MissionKind = "mission" | "exercise";

export interface MissionDefinition {
  readonly missionId: string;
  readonly title: string;
  readonly kind: MissionKind;
  /** 任意の目標値・単位（例: "30分", "8000歩"） */
  readonly target: string | null;
}

export interface MissionRevision {
  /** 定義版。1から単調増加 */
  readonly revision: number;
  /** この定義が適用される最初の日付（Asia/Tokyo） */
  readonly validFrom: LocalDate;
  readonly definitions: readonly MissionDefinition[];
}

export interface MissionConfiguration {
  readonly schemaVersion: 1;
  readonly setupDate: LocalDate;
  /** validFrom昇順・revision昇順の改訂履歴。最後が現在有効な定義 */
  readonly revisions: readonly MissionRevision[];
}

export interface MissionDefinitionInput {
  readonly missionId?: string | null;
  readonly title?: unknown;
  readonly kind?: unknown;
  readonly target?: unknown;
}

const MISSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidMissionId(value: unknown): value is string {
  return typeof value === "string" && MISSION_ID_PATTERN.test(value);
}

/** 利用者入力を検証し、1〜15件のミッション定義に変換する。新規項目にはidを採番する */
export function validateMissionDefinitions(
  input: unknown,
  newId: () => string,
): Result<MissionDefinition[]> {
  if (!Array.isArray(input)) {
    return fail("ValidationError", "ミッション一覧の形式が正しくありません。");
  }
  if (input.length < MIN_MISSIONS) {
    return fail("ValidationError", "ミッションを1件以上設定してください。", { definitions: "1件以上必要です" });
  }
  if (input.length > MAX_MISSIONS) {
    return fail("ValidationError", `ミッションは最大${MAX_MISSIONS}件までです。`, { definitions: `最大${MAX_MISSIONS}件です` });
  }
  const details: Record<string, string> = {};
  const seen = new Set<string>();
  const result: MissionDefinition[] = [];
  input.forEach((raw: MissionDefinitionInput, index) => {
    if (typeof raw !== "object" || raw === null) {
      details[`definitions.${index}`] = "形式が正しくありません";
      return;
    }
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (title.length === 0) details[`definitions.${index}.title`] = "名称を入力してください";
    else if (title.length > MISSION_TITLE_MAX) details[`definitions.${index}.title`] = `${MISSION_TITLE_MAX}文字以内で入力してください`;

    const kind: MissionKind | null = raw.kind === "exercise" ? "exercise" : raw.kind === "mission" || raw.kind === undefined ? "mission" : null;
    if (kind === null) details[`definitions.${index}.kind`] = "種別が正しくありません";

    let target: string | null = null;
    if (raw.target !== undefined && raw.target !== null) {
      if (typeof raw.target !== "string") details[`definitions.${index}.target`] = "目標の形式が正しくありません";
      else {
        const t = raw.target.trim();
        if (t.length > MISSION_TARGET_MAX) details[`definitions.${index}.target`] = `${MISSION_TARGET_MAX}文字以内で入力してください`;
        target = t.length === 0 ? null : t;
      }
    }

    let missionId: string;
    if (raw.missionId === undefined || raw.missionId === null || raw.missionId === "") {
      missionId = newId();
    } else if (isValidMissionId(raw.missionId)) {
      missionId = raw.missionId;
    } else {
      details[`definitions.${index}.missionId`] = "識別子が正しくありません";
      return;
    }
    if (seen.has(missionId)) {
      details[`definitions.${index}.missionId`] = "識別子が重複しています";
      return;
    }
    seen.add(missionId);
    result.push({ missionId, title, kind: kind ?? "mission", target });
  });
  if (Object.keys(details).length > 0) {
    return fail("ValidationError", "ミッションの入力内容を確認してください。", details);
  }
  return ok(result);
}

/** 初回設定。setupDateは保存日のAsia/Tokyo日付（BR-05） */
export function createMissionConfiguration(
  definitions: readonly MissionDefinition[],
  today: LocalDate,
): MissionConfiguration {
  return {
    schemaVersion: 1,
    setupDate: today,
    revisions: [{ revision: 1, validFrom: today, definitions: [...definitions] }],
  };
}

/** 定義変更を編集日以降へ適用する新revisionを追加する（BR-07）。過去のrevisionは変更しない */
export function reviseMissionConfiguration(
  config: MissionConfiguration,
  definitions: readonly MissionDefinition[],
  today: LocalDate,
): MissionConfiguration {
  const last = config.revisions[config.revisions.length - 1];
  const lastRevision = last?.revision ?? 0;
  // 時計の巻き戻り等で編集日が直前の適用日より前にならないようにする
  const validFrom = last && last.validFrom > today ? last.validFrom : today;
  return {
    ...config,
    revisions: [...config.revisions, { revision: lastRevision + 1, validFrom, definitions: [...definitions] }],
  };
}

/** 日付に適用されるrevision。setupDateより前はnull（ミッション条件N/A, BR-10） */
export function effectiveRevision(
  config: MissionConfiguration | null,
  date: LocalDate,
): MissionRevision | null {
  if (!config || date < config.setupDate) return null;
  let found: MissionRevision | null = null;
  for (const rev of config.revisions) {
    if (rev.validFrom <= date) found = rev;
  }
  return found;
}

export function currentRevision(config: MissionConfiguration): MissionRevision {
  const last = config.revisions[config.revisions.length - 1];
  if (!last) throw new Error("MissionConfiguration has no revisions");
  return last;
}

/** 永続化JSONから復元したMission Configurationの構造・不変条件を検証する */
export function parseMissionConfiguration(value: unknown): Result<MissionConfiguration> {
  const invalid = fail<MissionConfiguration>("UnexpectedFailure", "ミッション設定データを読み込めませんでした。");
  if (typeof value !== "object" || value === null) return invalid;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || !isValidLocalDate(v.setupDate) || !Array.isArray(v.revisions) || v.revisions.length === 0) {
    return invalid;
  }
  const revisions: MissionRevision[] = [];
  let prev: MissionRevision | null = null;
  for (const r of v.revisions as unknown[]) {
    if (typeof r !== "object" || r === null) return invalid;
    const rr = r as Record<string, unknown>;
    if (typeof rr.revision !== "number" || !Number.isInteger(rr.revision) || rr.revision < 1) return invalid;
    if (!isValidLocalDate(rr.validFrom)) return invalid;
    if (prev && (rr.revision <= prev.revision || rr.validFrom < prev.validFrom)) return invalid;
    if (!Array.isArray(rr.definitions)) return invalid;
    let missingId = false;
    const defs = validateMissionDefinitions(rr.definitions, () => {
      missingId = true;
      return `missing-${Math.random().toString(36).slice(2)}`;
    });
    if (!defs.ok || missingId) return invalid;
    const rev: MissionRevision = { revision: rr.revision, validFrom: rr.validFrom, definitions: defs.value };
    revisions.push(rev);
    prev = rev;
  }
  if (revisions[0]!.validFrom !== v.setupDate) return invalid;
  return { ok: true, value: { schemaVersion: 1, setupDate: v.setupDate, revisions } };
}

export function serializeMissionConfiguration(config: MissionConfiguration): string {
  return JSON.stringify(config);
}

export function deserializeMissionConfiguration(json: string): Result<MissionConfiguration> {
  try {
    return parseMissionConfiguration(JSON.parse(json));
  } catch {
    return fail("UnexpectedFailure", "ミッション設定データを読み込めませんでした。");
  }
}

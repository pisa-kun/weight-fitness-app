import { describe, expect, it } from "vitest";
import {
  addImageReference,
  applyDayUpdate,
  isDayComplete,
  removeImageReference,
  resolveMissionStates,
  setMonthlyGoal,
} from "../../src/domain/day-logic";
import { imageObjectKey, type FoodImageReference } from "../../src/domain/images";
import { createMissionConfiguration, reviseMissionConfiguration } from "../../src/domain/missions";
import { emptyMonth } from "../../src/domain/month-document";

const defs1 = [
  { missionId: "a", title: "腹筋", kind: "mission" as const, target: "30回" },
  { missionId: "b", title: "ウォーキング", kind: "exercise" as const, target: "30分" },
];
const config = createMissionConfiguration(defs1, "2026-10-04");

const imageRef = (date: string, n: number): FoodImageReference => {
  const imageId = `00000000-0000-4000-8000-00000000000${n}`;
  return { imageId, objectKey: imageObjectKey(date, imageId), contentType: "image/jpeg", sizeBytes: 100, attachedDate: date };
};

describe("日次完了判定（例ベース, BR-09〜BR-11）", () => {
  it("体重と全ミッション達成で完了、1件でも未達成なら未完了", () => {
    let doc = emptyMonth("2026-10");
    const r1 = applyDayUpdate(doc, "2026-10-05", { weightKg: 65.2, missionCompletions: { a: true } }, config);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    doc = r1.value;
    const day = doc.days["2026-10-05"]!;
    expect(isDayComplete(day.weightKg, day.missionStates)).toBe(false);

    const r2 = applyDayUpdate(doc, "2026-10-05", { missionCompletions: { b: true } }, config);
    if (!r2.ok) throw new Error("unexpected");
    const day2 = r2.value.days["2026-10-05"]!;
    expect(isDayComplete(day2.weightKg, day2.missionStates)).toBe(true);
  });

  it("setupDate前は体重だけで完了（Q16-B）し、ミッションは記録できない", () => {
    const doc = emptyMonth("2026-10");
    const r = applyDayUpdate(doc, "2026-10-01", { weightKg: 64 }, config);
    if (!r.ok) throw new Error("unexpected");
    const day = r.value.days["2026-10-01"]!;
    expect(day.missionStates).toBeNull();
    expect(isDayComplete(day.weightKg, day.missionStates)).toBe(true);

    const r2 = applyDayUpdate(doc, "2026-10-01", { missionCompletions: { a: true } }, config);
    expect(r2.ok).toBe(false);
  });

  it("画像の有無は完了判定に影響しない", () => {
    const r = applyDayUpdate(emptyMonth("2026-10"), "2026-10-06", { weightKg: 60, missionCompletions: { a: true, b: true } }, config);
    if (!r.ok) throw new Error("unexpected");
    const withImage = addImageReference(r.value, imageRef("2026-10-06", 1), config);
    if (!withImage.ok) throw new Error("unexpected");
    const d1 = r.value.days["2026-10-06"]!;
    const d2 = withImage.value.days["2026-10-06"]!;
    expect(isDayComplete(d1.weightKg, d1.missionStates)).toBe(isDayComplete(d2.weightKg, d2.missionStates));
  });

  it("体重を消去すると未完了になる", () => {
    const r = applyDayUpdate(emptyMonth("2026-10"), "2026-10-02", { weightKg: 60 }, config);
    if (!r.ok) throw new Error("unexpected");
    const r2 = applyDayUpdate(r.value, "2026-10-02", { weightKg: null }, config);
    if (!r2.ok) throw new Error("unexpected");
    expect(isDayComplete(r2.value.days["2026-10-02"]!.weightKg, null)).toBe(false);
  });

  it("別月の日付や不正な体重は拒否する", () => {
    expect(applyDayUpdate(emptyMonth("2026-10"), "2026-11-01", { weightKg: 60 }, config).ok).toBe(false);
    expect(applyDayUpdate(emptyMonth("2026-10"), "2026-10-01", { weightKg: -1 }, config).ok).toBe(false);
    expect(applyDayUpdate(emptyMonth("2026-10"), "2026-10-05", { missionCompletions: { zzz: true } }, config).ok).toBe(false);
  });
});

describe("ミッション編集の適用（例ベース, BR-07）", () => {
  it("過去日のsnapshotは保持し、編集日は新定義へ再snapshotして達成状態を引き継ぐ", () => {
    const r = applyDayUpdate(emptyMonth("2026-10"), "2026-10-05", { missionCompletions: { a: true } }, config);
    if (!r.ok) throw new Error("unexpected");
    const r2 = applyDayUpdate(r.value, "2026-10-10", { missionCompletions: { a: true } }, config);
    if (!r2.ok) throw new Error("unexpected");

    const revised = reviseMissionConfiguration(
      config,
      [{ missionId: "a", title: "腹筋（改）", kind: "mission", target: "50回" }, { missionId: "c", title: "ストレッチ", kind: "mission", target: null }],
      "2026-10-10",
    );
    const past = resolveMissionStates(r2.value.days["2026-10-05"], revised, "2026-10-05");
    expect(past).toEqual(r2.value.days["2026-10-05"]!.missionStates);

    const editDay = resolveMissionStates(r2.value.days["2026-10-10"], revised, "2026-10-10");
    expect(editDay?.map((s) => [s.missionId, s.titleSnapshot, s.isCompleted, s.definitionVersion])).toEqual([
      ["a", "腹筋（改）", true, 2],
      ["c", "ストレッチ", false, 2],
    ]);
  });
});

describe("画像参照（例ベース, BR-12〜BR-14）", () => {
  it("3枚目は拒否し既存を変更しない", () => {
    const date = "2026-10-07";
    let doc = emptyMonth("2026-10");
    for (const n of [1, 2]) {
      const r = addImageReference(doc, imageRef(date, n), config);
      if (!r.ok) throw new Error("unexpected");
      doc = r.value;
    }
    const third = addImageReference(doc, imageRef(date, 3), config);
    expect(third.ok).toBe(false);
    expect(doc.days[date]!.images).toHaveLength(2);
  });

  it("個別削除は対象のみ取り除き、存在しなければremoved=false", () => {
    const date = "2026-10-07";
    const r = addImageReference(emptyMonth("2026-10"), imageRef(date, 1), config);
    if (!r.ok) throw new Error("unexpected");
    const removed = removeImageReference(r.value, date, imageRef(date, 1).imageId);
    expect(removed.removed).toBe(true);
    expect(removed.doc.days[date]!.images).toHaveLength(0);
    expect(removeImageReference(removed.doc, date, imageRef(date, 1).imageId).removed).toBe(false);
  });
});

describe("月間目標（例ベース, BR-17）", () => {
  it("空文字は未設定、201文字は拒否", () => {
    const doc = emptyMonth("2026-10");
    expect(setMonthlyGoal(doc, "  ")).toEqual({ ok: true, value: { ...doc, monthlyGoal: null } });
    expect(setMonthlyGoal(doc, "あ".repeat(201)).ok).toBe(false);
    const r = setMonthlyGoal(doc, " 毎日歩く ");
    if (r.ok) expect(r.value.monthlyGoal).toBe("毎日歩く");
  });
});

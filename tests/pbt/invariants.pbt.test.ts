import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isValidLocalDate, yearMonthOf } from "../../src/domain/dates";
import {
  addImageReference,
  applyDayUpdate,
  isDayComplete,
  removeImageReference,
  resolveMissionStates,
} from "../../src/domain/day-logic";
import { MAX_IMAGES_PER_DAY } from "../../src/domain/images";
import {
  effectiveRevision,
  MAX_MISSIONS,
  reviseMissionConfiguration,
  validateMissionDefinitions,
} from "../../src/domain/missions";
import { emptyMonth } from "../../src/domain/month-document";
import { parseWeightKg } from "../../src/domain/weight";
import {
  addDays,
  imageReferenceArb,
  localDateArb,
  missionConfigurationArb,
  missionDefinitionsArb,
  snapshotArb,
  weightKgArb,
} from "./generators";

// PBT-03: 業務不変条件（Property-based）

describe("[PBT] 体重の不変条件", () => {
  it("有効な体重は正数かつ0.1 kg精度のまま受理される", () => {
    fc.assert(
      fc.property(weightKgArb, (w) => {
        const r = parseWeightKg(w);
        expect(r.ok).toBe(true);
        if (r.ok) {
          expect(r.value).toBeGreaterThan(0);
          expect(Math.round(r.value * 10) / 10).toBe(r.value);
        }
      }),
    );
  });

  it("0以下の値は常に拒否される", () => {
    fc.assert(
      fc.property(fc.double({ max: 0, noNaN: true }), (w) => {
        expect(parseWeightKg(w).ok).toBe(false);
      }),
    );
  });
});

describe("[PBT] ミッション件数の不変条件", () => {
  it("受理される定義は常に1〜15件で、16件以上は拒否される", () => {
    fc.assert(
      fc.property(fc.array(fc.record({ title: fc.constantFrom("a", "腹筋", " 歩く ") }), { maxLength: 20 }), (input) => {
        let n = 0;
        const r = validateMissionDefinitions(input, () => `id-${++n}`);
        if (input.length >= 1 && input.length <= MAX_MISSIONS) {
          expect(r.ok).toBe(true);
          if (r.ok) expect(r.value).toHaveLength(input.length);
        } else {
          expect(r.ok).toBe(false);
        }
      }),
    );
  });
});

describe("[PBT] 日ごとの画像枚数の不変条件", () => {
  it("どの順で追加・削除しても1日の画像参照は0〜2件", () => {
    const date = "2026-10-15";
    const ops = fc.array(
      fc.oneof(
        imageReferenceArb(date).map((ref) => ({ kind: "add" as const, ref })),
        fc.nat({ max: 3 }).map((index) => ({ kind: "remove" as const, index })),
      ),
      { maxLength: 12 },
    );
    fc.assert(
      fc.property(ops, (sequence) => {
        let doc = emptyMonth("2026-10");
        for (const op of sequence) {
          if (op.kind === "add") {
            const before = doc.days[date]?.images.length ?? 0;
            const r = addImageReference(doc, op.ref, null);
            if (before >= MAX_IMAGES_PER_DAY) expect(r.ok).toBe(false);
            if (r.ok) doc = r.value;
          } else {
            const target = doc.days[date]?.images[op.index];
            if (target) doc = removeImageReference(doc, date, target.imageId).doc;
          }
          const count = doc.days[date]?.images.length ?? 0;
          expect(count).toBeGreaterThanOrEqual(0);
          expect(count).toBeLessThanOrEqual(MAX_IMAGES_PER_DAY);
        }
      }),
    );
  });
});

describe("[PBT] 日次完了判定の不変条件", () => {
  it("完了は体重ありかつ全ミッション達成（N/Aなら体重のみ）と同値", () => {
    fc.assert(
      fc.property(
        fc.option(fc.uniqueArray(snapshotArb, { minLength: 1, maxLength: MAX_MISSIONS, selector: (s) => s.missionId }), {
          nil: null,
        }),
        fc.option(weightKgArb, { nil: null }),
        (states, weight) => {
          const expected = weight !== null && (states === null || states.every((s) => s.isCompleted));
          expect(isDayComplete(weight, states)).toBe(expected);
        },
      ),
    );
  });

  it("setupDate前の日はミッション状態を作らずN/Aとなる", () => {
    fc.assert(
      fc.property(missionConfigurationArb, fc.integer({ min: 1, max: 400 }), weightKgArb, (config, back, weight) => {
        const date = addDays(config.setupDate, -back);
        expect(effectiveRevision(config, date)).toBeNull();
        const r = applyDayUpdate(emptyMonth(yearMonthOf(date)), date, { weightKg: weight }, config);
        expect(r.ok).toBe(true);
        if (r.ok) {
          const day = r.value.days[date]!;
          expect(day.missionStates).toBeNull();
          expect(isDayComplete(day.weightKg, day.missionStates)).toBe(true);
        }
      }),
    );
  });

  it("setupDate以降の日は常に1件以上のミッションが適用される（BR-08）", () => {
    fc.assert(
      fc.property(missionConfigurationArb, fc.integer({ min: 0, max: 400 }), (config, forward) => {
        const date = addDays(config.setupDate, forward);
        const states = resolveMissionStates(undefined, config, date);
        expect(states).not.toBeNull();
        expect(states!.length).toBeGreaterThanOrEqual(1);
        expect(states!.length).toBeLessThanOrEqual(MAX_MISSIONS);
      }),
    );
  });
});

describe("[PBT] ミッション編集は過去日のsnapshotを変えない（BR-07）", () => {
  it("編集日より前に保存されたsnapshotは編集後も同一", () => {
    fc.assert(
      fc.property(
        missionConfigurationArb,
        missionDefinitionsArb(),
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 0, max: 60 }),
        (config, newDefs, editOffset, pastOffset) => {
          const last = config.revisions[config.revisions.length - 1]!;
          const editDate = addDays(last.validFrom, editOffset);
          const pastDate = addDays(editDate, -1 - (pastOffset % Math.max(1, editOffset)));
          if (pastDate < config.setupDate) return;
          const saved = resolveMissionStates(undefined, config, pastDate);
          const day = { weightKg: null, missionStates: saved, images: [] };
          const revised = reviseMissionConfiguration(config, newDefs, editDate);
          expect(resolveMissionStates(day, revised, pastDate)).toEqual(saved);
        },
      ),
    );
  });
});

describe("[PBT] 日付生成器の妥当性", () => {
  it("生成した日付は所属月と一致する", () => {
    fc.assert(
      fc.property(localDateArb, (d) => {
        expect(isValidLocalDate(d)).toBe(true);
        expect(d.startsWith(yearMonthOf(d))).toBe(true);
      }),
    );
  });
});

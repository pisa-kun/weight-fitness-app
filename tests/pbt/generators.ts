import fc from "fast-check";
import { datesOfMonth, type LocalDate, type YearMonth } from "../../src/domain/dates";
import { IMAGE_CONTENT_TYPES, imageObjectKey, MAX_IMAGES_PER_DAY, MAX_STORED_IMAGE_BYTES, type FoodImageReference } from "../../src/domain/images";
import {
  MAX_MISSIONS,
  MISSION_TARGET_MAX,
  MISSION_TITLE_MAX,
  type MissionConfiguration,
  type MissionDefinition,
  type MissionRevision,
} from "../../src/domain/missions";
import { MONTHLY_GOAL_MAX, type DayRecord, type MissionStateSnapshot, type MonthDocument } from "../../src/domain/month-document";

// PBT-07: 業務制約に従うドメイン生成器を集約する

/** 0.1 kg単位の正の体重。境界値（0.1 kg）や大きな値も含む */
export const weightKgArb: fc.Arbitrary<number> = fc
  .oneof(
    { weight: 8, arbitrary: fc.integer({ min: 300, max: 1500 }) },
    { weight: 1, arbitrary: fc.constantFrom(1, 2, 9999, 100000) },
    { weight: 1, arbitrary: fc.integer({ min: 1, max: 10_000_000 }) },
  )
  .map((tenths) => tenths / 10);

export const yearMonthArb: fc.Arbitrary<YearMonth> = fc
  .record({ year: fc.integer({ min: 2000, max: 2099 }), month: fc.integer({ min: 1, max: 12 }) })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, "0")}`);

export const dateInMonthArb = (ym: YearMonth): fc.Arbitrary<LocalDate> => fc.constantFrom(...datesOfMonth(ym));

export const localDateArb: fc.Arbitrary<LocalDate> = yearMonthArb.chain(dateInMonthArb);

/** 前後に空白を含まない表示文字列（日本語・絵文字・記号を含む） */
const trimmedText = (max: number, minLength = 1) =>
  fc
    .string({ unit: fc.constantFrom("a", "Z", "0", "腹", "筋", "歩", "🏃", "-", " ", "ー"), minLength, maxLength: max })
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength && s.length <= max);

export const missionIdArb: fc.Arbitrary<string> = fc.uuid().map((u) => u.toLowerCase());

export const missionDefinitionArb: fc.Arbitrary<MissionDefinition> = fc.record({
  missionId: missionIdArb,
  title: trimmedText(MISSION_TITLE_MAX),
  kind: fc.constantFrom("mission" as const, "exercise" as const),
  target: fc.option(trimmedText(MISSION_TARGET_MAX), { nil: null }),
});

export const missionDefinitionsArb = (min = 1, max = MAX_MISSIONS): fc.Arbitrary<MissionDefinition[]> =>
  fc.uniqueArray(missionDefinitionArb, { minLength: min, maxLength: max, selector: (d) => d.missionId });

/** 適用日が昇順・revisionが連番のMission Configuration */
export const missionConfigurationArb: fc.Arbitrary<MissionConfiguration> = fc
  .record({
    setupDate: localDateArb,
    revisionDefs: fc.array(missionDefinitionsArb(), { minLength: 1, maxLength: 4 }),
    gaps: fc.array(fc.integer({ min: 0, max: 40 }), { minLength: 4, maxLength: 4 }),
  })
  .map(({ setupDate, revisionDefs, gaps }) => {
    let date = setupDate;
    const revisions: MissionRevision[] = revisionDefs.map((definitions, i) => {
      if (i > 0) date = addDays(date, gaps[i] ?? 0);
      return { revision: i + 1, validFrom: date, definitions };
    });
    return { schemaVersion: 1 as const, setupDate, revisions };
  });

export const snapshotArb: fc.Arbitrary<MissionStateSnapshot> = fc.record({
  missionId: missionIdArb,
  titleSnapshot: trimmedText(MISSION_TITLE_MAX),
  kind: fc.constantFrom("mission" as const, "exercise" as const),
  targetSnapshot: fc.option(trimmedText(MISSION_TARGET_MAX), { nil: null }),
  isCompleted: fc.boolean(),
  definitionVersion: fc.integer({ min: 1, max: 50 }),
});

export const imageReferenceArb = (date: LocalDate): fc.Arbitrary<FoodImageReference> =>
  fc
    .record({
      imageId: fc.uuid().map((u) => u.toLowerCase()),
      contentType: fc.constantFrom(...IMAGE_CONTENT_TYPES),
      sizeBytes: fc.integer({ min: 1, max: MAX_STORED_IMAGE_BYTES }),
    })
    .map((r) => ({ ...r, objectKey: imageObjectKey(date, r.imageId), attachedDate: date }));

export const dayRecordArb = (date: LocalDate): fc.Arbitrary<DayRecord> =>
  fc.record({
    weightKg: fc.option(weightKgArb, { nil: null }),
    missionStates: fc.option(
      fc.uniqueArray(snapshotArb, { minLength: 1, maxLength: MAX_MISSIONS, selector: (s) => s.missionId }),
      { nil: null },
    ),
    images: fc.uniqueArray(imageReferenceArb(date), { minLength: 0, maxLength: MAX_IMAGES_PER_DAY, selector: (i) => i.imageId }),
  });

export const monthDocumentArb: fc.Arbitrary<MonthDocument> = yearMonthArb.chain((month) =>
  fc
    .record({
      monthlyGoal: fc.option(trimmedText(MONTHLY_GOAL_MAX), { nil: null }),
      dates: fc.uniqueArray(dateInMonthArb(month), { maxLength: 10 }),
    })
    .chain(({ monthlyGoal, dates }) =>
      fc.tuple(...dates.map((d) => dayRecordArb(d))).map((records) => {
        const days: Record<LocalDate, DayRecord> = {};
        dates.forEach((d, i) => {
          days[d] = records[i]!;
        });
        return { schemaVersion: 1 as const, month, monthlyGoal, days };
      }),
    ),
);

export function addDays(date: LocalDate, n: number): LocalDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

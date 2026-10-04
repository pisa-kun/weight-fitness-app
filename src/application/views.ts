import { datesOfMonth, type YearMonth } from "../domain/dates";
import { isDayComplete, resolveMissionStates } from "../domain/day-logic";
import { currentRevision, type MissionConfiguration } from "../domain/missions";
import type { MonthDocument } from "../domain/month-document";
import type { DayView, MissionConfigView, MonthView } from "../shared/api-contract";

// ドメインモデル → 画面向け読み取りモデル。objectKeyなど内部情報は含めない

export function toMissionConfigView(config: MissionConfiguration, version: string): MissionConfigView {
  const rev = currentRevision(config);
  return {
    setupDate: config.setupDate,
    revision: rev.revision,
    definitions: rev.definitions.map((d) => ({ ...d })),
    version,
  };
}

export function buildMonthView(
  ym: YearMonth,
  doc: MonthDocument,
  version: string | null,
  config: MissionConfiguration | null,
  configVersion: string | null,
  today: string,
): MonthView {
  const days: DayView[] = datesOfMonth(ym).map((date) => {
    const day = doc.days[date];
    const states = resolveMissionStates(day, config, date);
    const weightKg = day?.weightKg ?? null;
    return {
      date,
      weightKg,
      missions:
        states?.map((s) => ({
          missionId: s.missionId,
          title: s.titleSnapshot,
          kind: s.kind,
          target: s.targetSnapshot,
          isCompleted: s.isCompleted,
        })) ?? null,
      images: (day?.images ?? []).map((i) => ({ imageId: i.imageId, contentType: i.contentType, sizeBytes: i.sizeBytes })),
      isComplete: isDayComplete(weightKg, states),
      hasRecord: weightKg !== null || (day?.images.length ?? 0) > 0 || (states?.some((s) => s.isCompleted) ?? false),
    };
  });
  return {
    month: ym,
    version,
    monthlyGoal: doc.monthlyGoal,
    today,
    days,
    missionConfiguration: config && configVersion ? toMissionConfigView(config, configVersion) : null,
  };
}

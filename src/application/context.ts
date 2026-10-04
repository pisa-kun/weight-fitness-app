import { todayInTokyo, type YearMonth } from "../domain/dates";
import type { MissionConfiguration } from "../domain/missions";
import type { MonthDocument } from "../domain/month-document";
import { fail, ok, type Result } from "../domain/result";
import type {
  ImageObjectStore,
  MissionConfigurationRepository,
  MonthlyJsonRepository,
  Versioned,
} from "../infrastructure/repositories";
import type { MonthView } from "../shared/api-contract";
import { buildMonthView } from "./views";

/** 機能サービスが共有する依存 */
export interface ServiceContext {
  readonly months: MonthlyJsonRepository;
  readonly missions: MissionConfigurationRepository;
  readonly images: ImageObjectStore;
  readonly now: () => Date;
  readonly newId: () => string;
}

export const today = (ctx: ServiceContext) => todayInTokyo(ctx.now());

/** 読み込んだ版と要求の期待版が一致しなければConflict（BR-15） */
export function checkVersion(actual: string | null, expected: string | null): Result<void> {
  return actual === expected ? ok(undefined) : fail("Conflict", "他の端末で更新されています。最新を読み込んでから再度保存してください。");
}

export interface MonthState {
  readonly month: Versioned<MonthDocument>;
  readonly config: Versioned<MissionConfiguration | null>;
}

export async function loadMonthState(ctx: ServiceContext, ym: YearMonth): Promise<Result<MonthState>> {
  const [config, month] = await Promise.all([ctx.missions.readConfiguration(), ctx.months.readMonth(ym)]);
  if (!config.ok) return config;
  if (!month.ok) return month;
  return ok({ month: month.value, config: config.value });
}

export function viewOf(ctx: ServiceContext, ym: YearMonth, state: MonthState, doc?: MonthDocument, version?: string | null): MonthView {
  return buildMonthView(
    ym,
    doc ?? state.month.value,
    version === undefined ? state.month.version : version,
    state.config.value,
    state.config.version,
    today(ctx),
  );
}

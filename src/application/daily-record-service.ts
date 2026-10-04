import { isValidLocalDate, yearMonthOf, type LocalDate } from "../domain/dates";
import { applyDayUpdate, type DayUpdate } from "../domain/day-logic";
import { fail, ok, type Result } from "../domain/result";
import type { MonthView } from "../shared/api-contract";
import { checkVersion, loadMonthState, viewOf, type ServiceContext } from "./context";

/** 体重・ミッション達成状態の日次更新（US-01〜US-03, US-08） */
export class DailyRecordService {
  constructor(private readonly ctx: ServiceContext) {}

  async saveDay(date: LocalDate, update: DayUpdate, expectedVersion: string | null): Promise<Result<MonthView>> {
    if (!isValidLocalDate(date)) return fail("ValidationError", "日付が正しくありません。");
    const ym = yearMonthOf(date);
    const state = await loadMonthState(this.ctx, ym);
    if (!state.ok) return state;
    const version = checkVersion(state.value.month.version, expectedVersion);
    if (!version.ok) return version;

    const next = applyDayUpdate(state.value.month.value, date, update, state.value.config.value);
    if (!next.ok) return next;
    const written = await this.ctx.months.writeMonth(ym, next.value, expectedVersion);
    if (!written.ok) return written;
    return ok(viewOf(this.ctx, ym, state.value, next.value, written.value));
  }
}

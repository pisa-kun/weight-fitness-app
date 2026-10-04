import { isValidYearMonth, type YearMonth } from "../domain/dates";
import { setMonthlyGoal } from "../domain/day-logic";
import { fail, ok, type Result } from "../domain/result";
import type { MonthView } from "../shared/api-contract";
import { checkVersion, loadMonthState, viewOf, type ServiceContext } from "./context";

/** 月間目標の保存（US-05） */
export class MonthlyGoalService {
  constructor(private readonly ctx: ServiceContext) {}

  async setGoal(ym: YearMonth, goal: unknown, expectedVersion: string | null): Promise<Result<MonthView>> {
    if (!isValidYearMonth(ym)) return fail("ValidationError", "月の指定が正しくありません。");
    const state = await loadMonthState(this.ctx, ym);
    if (!state.ok) return state;
    const version = checkVersion(state.value.month.version, expectedVersion);
    if (!version.ok) return version;

    const next = setMonthlyGoal(state.value.month.value, goal);
    if (!next.ok) return next;
    const written = await this.ctx.months.writeMonth(ym, next.value, expectedVersion);
    if (!written.ok) return written;
    return ok(viewOf(this.ctx, ym, state.value, next.value, written.value));
  }
}

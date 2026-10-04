import { isValidYearMonth, type YearMonth } from "../domain/dates";
import { fail, ok, type Result } from "../domain/result";
import type { MonthView } from "../shared/api-contract";
import { loadMonthState, viewOf, type ServiceContext } from "./context";

/** 月JSONとミッション設定から、カレンダー表示用の読み取りモデルを作る（US-06） */
export class CalendarQueryService {
  constructor(private readonly ctx: ServiceContext) {}

  async getMonthView(ym: YearMonth): Promise<Result<MonthView>> {
    if (!isValidYearMonth(ym)) return fail("ValidationError", "月の指定が正しくありません。");
    const state = await loadMonthState(this.ctx, ym);
    if (!state.ok) return state;
    return ok(viewOf(this.ctx, ym, state.value));
  }
}

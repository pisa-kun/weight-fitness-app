import { describe, expect, it } from "vitest";
import {
  addMonths,
  datesOfMonth,
  daysInMonth,
  isValidLocalDate,
  isValidYearMonth,
  todayInTokyo,
  weekdayOf,
} from "../../src/domain/dates";

describe("dates（例ベース）", () => {
  it("UTCでは前日でも、日本時間で日付を解決する（BR-01）", () => {
    // 2026-10-03T15:30Z は日本時間 2026-10-04 00:30
    expect(todayInTokyo(new Date("2026-10-03T15:30:00Z"))).toBe("2026-10-04");
    expect(todayInTokyo(new Date("2026-10-03T14:59:59Z"))).toBe("2026-10-03");
  });

  it("うるう年の2月末日を扱う", () => {
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(isValidLocalDate("2026-02-29")).toBe(false);
    expect(isValidLocalDate("2028-02-29")).toBe(true);
  });

  it("不正な形式を拒否する", () => {
    expect(isValidYearMonth("2026-13")).toBe(false);
    expect(isValidYearMonth("2026-1")).toBe(false);
    expect(isValidLocalDate("2026-10-32")).toBe(false);
    expect(isValidLocalDate("../etc")).toBe(false);
  });

  it("月の加減算は年をまたぐ", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("月の日付一覧と曜日", () => {
    expect(datesOfMonth("2026-10")).toHaveLength(31);
    expect(weekdayOf("2026-10-04")).toBe(0); // 日曜
  });
});

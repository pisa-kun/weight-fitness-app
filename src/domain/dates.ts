// 業務日付はAsia/Tokyoで解決する（BR-01）。日付は"YYYY-MM-DD"、月は"YYYY-MM"の文字列で扱う。

export type LocalDate = string;
export type YearMonth = string;

export const BUSINESS_TIME_ZONE = "Asia/Tokyo";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export function isValidYearMonth(value: unknown): value is YearMonth {
  if (typeof value !== "string") return false;
  const m = MONTH_PATTERN.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return year >= 1900 && year <= 9999 && month >= 1 && month <= 12;
}

export function isValidLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== "string") return false;
  const m = DATE_PATTERN.exec(value);
  if (!m) return false;
  const ym = `${m[1]}-${m[2]}`;
  if (!isValidYearMonth(ym)) return false;
  const day = Number(m[3]);
  return day >= 1 && day <= daysInMonth(ym);
}

export function daysInMonth(ym: YearMonth): number {
  const [y, m] = splitYearMonth(ym);
  // Date.UTC(y, m, 0) は m月の末日
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function yearMonthOf(date: LocalDate): YearMonth {
  return date.slice(0, 7);
}

/** 指定した月の全日付を昇順で返す */
export function datesOfMonth(ym: YearMonth): LocalDate[] {
  const count = daysInMonth(ym);
  return Array.from({ length: count }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`);
}

/** 曜日（0=日曜〜6=土曜） */
export function weekdayOf(date: LocalDate): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const [y, m] = splitYearMonth(ym);
  const index = y * 12 + (m - 1) + delta;
  const ny = Math.floor(index / 12);
  const nm = (index % 12) + 1;
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}`;
}

/** 現在時刻をAsia/Tokyoの暦日へ変換する。端末のタイムゾーンには依存しない */
export function todayInTokyo(now: Date): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function splitYearMonth(ym: YearMonth): [number, number] {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return [y, m];
}

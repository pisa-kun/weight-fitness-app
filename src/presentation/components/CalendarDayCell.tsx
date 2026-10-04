import { formatWeightKg } from "../../domain/weight";
import type { DayView } from "../../shared/api-contract";

/** 日付・体重・ミッション達成数・完了色を表示する。色だけでなく記号と文言でも状態を示す（US-06, US-11） */
export function CalendarDayCell({ day, isToday, onSelect }: { day: DayView; isToday: boolean; onSelect: (date: string) => void }) {
  const dayNumber = Number(day.date.slice(8));
  const done = day.missions?.filter((m) => m.isCompleted).length ?? 0;
  const total = day.missions?.length ?? 0;
  const status = day.isComplete ? "完了" : day.hasRecord ? "記録あり" : "未記録";
  const classes = ["day-cell", isToday ? "is-today" : "", day.isComplete ? "is-complete" : day.hasRecord ? "has-record" : ""]
    .filter(Boolean)
    .join(" ");
  const label = [
    `${Number(day.date.slice(5, 7))}月${dayNumber}日`,
    isToday ? "今日" : "",
    status,
    day.weightKg !== null ? `体重${formatWeightKg(day.weightKg)}kg` : "",
    day.missions ? `ミッション${done}/${total}` : "ミッション対象外",
  ]
    .filter(Boolean)
    .join("、");

  return (
    <button type="button" className={classes} onClick={() => onSelect(day.date)} aria-label={label} data-testid={`calendar-day-${day.date}`}>
      <span className="day-number">{dayNumber}</span>
      {day.isComplete && (
        <span className="day-mark" aria-hidden="true">
          ✓
        </span>
      )}
      {day.weightKg !== null && <span className="day-weight">{formatWeightKg(day.weightKg)}</span>}
      {day.missions && (
        <span className="day-missions" aria-hidden="true">
          {done}/{total}
        </span>
      )}
    </button>
  );
}

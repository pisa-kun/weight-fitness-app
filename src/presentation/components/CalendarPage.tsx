import { weekdayOf } from "../../domain/dates";
import type { MonthView } from "../../shared/api-contract";
import { CalendarDayCell } from "./CalendarDayCell";
import { MonthlyGoalEditor } from "./MonthlyGoalEditor";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 月カレンダー。当日枠線・完了色・月間目標を表示する（US-05, US-06） */
export function CalendarPage({
  view,
  onPrev,
  onNext,
  onToday,
  onSelectDay,
  onEditMissions,
  onSaveGoal,
}: {
  view: MonthView;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectDay: (date: string) => void;
  onEditMissions: () => void;
  onSaveGoal: (goal: string | null) => Promise<boolean>;
}) {
  const [year, month] = view.month.split("-").map(Number) as [number, number];
  const leading = weekdayOf(view.days[0]!.date);

  return (
    <section className="calendar" data-testid="calendar-page">
      <MonthlyGoalEditor key={view.month} month={view.month} goal={view.monthlyGoal} onSave={onSaveGoal} />
      <div className="calendar-nav">
        <button type="button" className="button button-small" onClick={onPrev} aria-label="前の月" data-testid="calendar-prev-button">
          ‹ 前月
        </button>
        <h2 className="calendar-title" data-testid="calendar-title">
          {year}年{month}月
        </h2>
        <button type="button" className="button button-small" onClick={onNext} aria-label="次の月" data-testid="calendar-next-button">
          次月 ›
        </button>
      </div>
      <div className="button-row calendar-actions">
        <button type="button" className="button button-small" onClick={onToday} data-testid="calendar-today-button">
          今月へ
        </button>
        <button type="button" className="button button-small" onClick={onEditMissions} data-testid="calendar-edit-missions-button">
          ミッションを編集
        </button>
      </div>
      <div className="calendar-grid" role="grid" aria-label={`${year}年${month}月のカレンダー`}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday" role="columnheader">
            {w}
          </div>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`blank-${i}`} className="day-blank" aria-hidden="true" />
        ))}
        {view.days.map((day) => (
          <CalendarDayCell key={day.date} day={day} isToday={day.date === view.today} onSelect={onSelectDay} />
        ))}
      </div>
      <p className="legend">
        <span className="legend-item legend-complete">✓ 完了</span>
        <span className="legend-item legend-record">記録あり</span>
        <span className="legend-item legend-today">今日</span>
      </p>
    </section>
  );
}

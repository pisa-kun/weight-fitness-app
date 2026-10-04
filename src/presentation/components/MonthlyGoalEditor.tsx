import { useState } from "react";
import { MONTHLY_GOAL_MAX } from "../../domain/month-document";

/** 表示中の月の目標をカレンダー上部に常時表示し、編集する（US-05） */
export function MonthlyGoalEditor({
  month,
  goal,
  onSave,
}: {
  month: string;
  goal: string | null;
  onSave: (goal: string | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal ?? "");
  const [saving, setSaving] = useState(false);
  const [, m] = month.split("-");

  if (!editing) {
    return (
      <section className="goal" data-testid="monthly-goal">
        <h2 className="goal-label">{Number(m)}月の目標</h2>
        <p className="goal-text" data-testid="monthly-goal-text">
          {goal ?? "未設定"}
        </p>
        <button
          type="button"
          className="button button-small"
          onClick={() => {
            setDraft(goal ?? "");
            setEditing(true);
          }}
          data-testid="monthly-goal-edit-button"
        >
          目標を編集
        </button>
      </section>
    );
  }

  return (
    <form
      className="goal"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        const ok = await onSave(draft.trim() === "" ? null : draft.trim());
        setSaving(false);
        if (ok) setEditing(false);
      }}
      data-testid="monthly-goal-form"
    >
      <label className="field">
        <span className="field-label">{Number(m)}月の目標</span>
        <textarea
          value={draft}
          maxLength={MONTHLY_GOAL_MAX}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          data-testid="monthly-goal-input"
        />
      </label>
      <div className="button-row">
        <button type="button" className="button button-small" onClick={() => setEditing(false)} data-testid="monthly-goal-cancel-button">
          キャンセル
        </button>
        <button type="submit" className="button button-small button-primary" disabled={saving} data-testid="monthly-goal-save-button">
          保存
        </button>
      </div>
    </form>
  );
}

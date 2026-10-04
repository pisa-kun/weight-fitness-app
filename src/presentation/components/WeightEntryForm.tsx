import { useState } from "react";
import { formatWeightKg, parseWeightInput } from "../../domain/weight";

/** kgの正数を0.1 kg単位で入力・修正する（US-01） */
export function WeightEntryForm({
  date,
  weightKg,
  onSave,
}: {
  date: string;
  weightKg: number | null;
  onSave: (weightKg: number | null) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(weightKg === null ? "" : formatWeightKg(weightKg));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (value: number | null) => {
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="weight-form"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseWeightInput(draft);
        if (!parsed.ok) {
          setError(parsed.error.details?.weightKg ?? parsed.error.message);
          return;
        }
        setError(null);
        void save(parsed.value);
      }}
      data-testid="weight-entry-form"
    >
      <label className="field" htmlFor={`weight-${date}`}>
        <span className="field-label">体重（kg）</span>
      </label>
      <div className="inline-row">
        <input
          id={`weight-${date}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="例: 65.3"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `weight-error-${date}` : undefined}
          data-testid="weight-entry-input"
        />
        <button type="submit" className="button button-primary" disabled={saving} data-testid="weight-entry-save-button">
          保存
        </button>
        {weightKg !== null && (
          <button
            type="button"
            className="button"
            disabled={saving}
            onClick={() => {
              setDraft("");
              void save(null);
            }}
            data-testid="weight-entry-clear-button"
          >
            消去
          </button>
        )}
      </div>
      {error && (
        <p id={`weight-error-${date}`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

import { useState } from "react";
import { MAX_MISSIONS, MISSION_TARGET_MAX, MISSION_TITLE_MAX } from "../../domain/missions";
import type { MissionDefinitionDto, MissionDefinitionInputDto, MissionKindDto } from "../../shared/api-contract";

interface Row {
  readonly key: number;
  readonly missionId: string | null;
  readonly title: string;
  readonly kind: MissionKindDto;
  readonly target: string;
}

let rowKey = 0;
const toRow = (d?: MissionDefinitionDto): Row => ({
  key: ++rowKey,
  missionId: d?.missionId ?? null,
  title: d?.title ?? "",
  kind: d?.kind ?? "mission",
  target: d?.target ?? "",
});

/** ミッションを1〜15件で追加・編集する。運動目標も同じ一覧で扱う（US-02, US-04） */
export function MissionEditor({
  initial,
  mode,
  onSave,
  onCancel,
}: {
  initial: readonly MissionDefinitionDto[];
  mode: "setup" | "edit";
  onSave: (definitions: MissionDefinitionInputDto[]) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => (initial.length > 0 ? initial.map(toRow) : [toRow()]));
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const submit = async () => {
    const nextErrors: Record<number, string> = {};
    for (const r of rows) {
      const title = r.title.trim();
      if (title.length === 0) nextErrors[r.key] = "名称を入力してください";
      else if (title.length > MISSION_TITLE_MAX) nextErrors[r.key] = `名称は${MISSION_TITLE_MAX}文字以内です`;
      else if (r.target.trim().length > MISSION_TARGET_MAX) nextErrors[r.key] = `目標は${MISSION_TARGET_MAX}文字以内です`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      await onSave(
        rows.map((r) => ({ missionId: r.missionId, title: r.title.trim(), kind: r.kind, target: r.target.trim() || null })),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="mission-editor"
      data-testid="mission-editor-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="hint">
        {mode === "setup"
          ? `毎日のミッションを1〜${MAX_MISSIONS}件登録してください。運動目標もミッションとして登録します。`
          : "変更は今日（日本時間）以降の日に適用されます。過去の日の内容と達成状態は変わりません。"}
      </p>
      <ol className="mission-rows">
        {rows.map((r, index) => (
          <li key={r.key} className="mission-row">
            <label className="field">
              <span className="field-label">ミッション{index + 1}の名称</span>
              <input
                type="text"
                value={r.title}
                maxLength={MISSION_TITLE_MAX}
                onChange={(e) => update(r.key, { title: e.target.value })}
                aria-invalid={errors[r.key] ? true : undefined}
                data-testid={`mission-editor-title-input-${index}`}
              />
            </label>
            <label className="field">
              <span className="field-label">目標（任意）</span>
              <input
                type="text"
                value={r.target}
                maxLength={MISSION_TARGET_MAX}
                placeholder="例: 30分"
                onChange={(e) => update(r.key, { target: e.target.value })}
                data-testid={`mission-editor-target-input-${index}`}
              />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={r.kind === "exercise"}
                onChange={(e) => update(r.key, { kind: e.target.checked ? "exercise" : "mission" })}
                data-testid={`mission-editor-exercise-checkbox-${index}`}
              />
              <span>運動目標</span>
            </label>
            <button
              type="button"
              className="button button-small button-danger"
              disabled={rows.length <= 1}
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              data-testid={`mission-editor-remove-button-${index}`}
            >
              削除
            </button>
            {errors[r.key] && (
              <p className="field-error" role="alert">
                {errors[r.key]}
              </p>
            )}
          </li>
        ))}
      </ol>
      <p className="hint">
        {rows.length} / {MAX_MISSIONS} 件
      </p>
      <div className="button-row">
        <button
          type="button"
          className="button"
          disabled={rows.length >= MAX_MISSIONS}
          onClick={() => setRows((rs) => [...rs, toRow()])}
          data-testid="mission-editor-add-button"
        >
          ミッションを追加
        </button>
        {onCancel && (
          <button type="button" className="button" onClick={onCancel} data-testid="mission-editor-cancel-button">
            キャンセル
          </button>
        )}
        <button type="submit" className="button button-primary" disabled={saving} data-testid="mission-editor-save-button">
          {mode === "setup" ? "登録して始める" : "保存"}
        </button>
      </div>
    </form>
  );
}

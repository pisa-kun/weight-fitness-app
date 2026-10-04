import { useState } from "react";
import type { MissionStateDto } from "../../shared/api-contract";

/** その日にsnapshotされたミッションの達成状態を記録する（US-02, US-03） */
export function MissionChecklist({
  missions,
  onToggle,
}: {
  missions: readonly MissionStateDto[] | null;
  onToggle: (missionId: string, completed: boolean) => Promise<boolean>;
}) {
  const [pending, setPending] = useState<string | null>(null);

  if (missions === null) {
    return (
      <p className="hint" data-testid="mission-checklist-not-applicable">
        この日はミッション登録前のため、ミッションは対象外（N/A）です。体重を記録すると完了になります。
      </p>
    );
  }

  const done = missions.filter((m) => m.isCompleted).length;
  return (
    <fieldset className="mission-checklist" data-testid="mission-checklist">
      <legend>
        デイリーミッション（{done}/{missions.length}）
      </legend>
      <ul>
        {missions.map((m, index) => (
          <li key={m.missionId}>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={m.isCompleted}
                disabled={pending !== null}
                onChange={async (e) => {
                  setPending(m.missionId);
                  try {
                    await onToggle(m.missionId, e.target.checked);
                  } finally {
                    setPending(null);
                  }
                }}
                data-testid={`mission-checklist-checkbox-${index}`}
              />
              <span className="mission-title">
                {m.kind === "exercise" && <span className="tag">運動</span>}
                {m.title}
                {m.target && <span className="mission-target">（{m.target}）</span>}
              </span>
              {m.isCompleted && <span className="sr-only">達成済み</span>}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

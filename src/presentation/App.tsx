import { useCallback, useEffect, useRef, useState } from "react";
import { addMonths, todayInTokyo, yearMonthOf } from "../domain/dates";
import type { MissionDefinitionInputDto, MonthView } from "../shared/api-contract";
import { ApiError, api as defaultApi, type Api } from "./api-client";
import { AppShell } from "./components/AppShell";
import { CalendarPage } from "./components/CalendarPage";
import { ConflictNotice } from "./components/ConflictNotice";
import { DayDetailModal } from "./components/DayDetailModal";
import { MissionEditor } from "./components/MissionEditor";
import { MissionSetupGate } from "./components/MissionSetupGate";
import { OperationFeedback, type Feedback } from "./components/OperationFeedback";
import { prepareImageForUpload } from "./image-prep";

interface ConflictState {
  readonly label: string;
  readonly retry: () => Promise<boolean>;
}

/** 現在のMonthViewを受け取り、更新後のMonthView（またはvoid=再読込）を返す操作 */
type Mutation = (current: MonthView | null) => Promise<MonthView | void>;

export function App({ api = defaultApi, prepareImage = prepareImageForUpload }: { api?: Api; prepareImage?: (file: File) => Promise<Blob> }) {
  const [month, setMonth] = useState(() => yearMonthOf(todayInTokyo(new Date())));
  const [view, setViewState] = useState<MonthView | null>(null);
  const viewRef = useRef<MonthView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingMissions, setEditingMissions] = useState(false);

  const setView = useCallback((v: MonthView) => {
    viewRef.current = v;
    setViewState(v);
  }, []);

  const load = useCallback(
    async (ym: string): Promise<boolean> => {
      try {
        setView(await api.getMonth(ym));
        setLoadError(null);
        return true;
      } catch (e) {
        setLoadError(e instanceof ApiError ? e.message : "記録を読み込めませんでした。");
        return false;
      }
    },
    [api, setView],
  );

  useEffect(() => {
    void load(month);
  }, [load, month]);

  /** 保存操作の共通処理。失敗時は未保存を明示し、Conflict時は草稿を残して再適用を案内する（BR-16, BR-22） */
  const mutate = useCallback(
    async (label: string, op: Mutation): Promise<boolean> => {
      setFeedback({ kind: "pending", message: `${label}を保存しています…` });
      try {
        const next = await op(viewRef.current);
        if (next) setView(next);
        else if (viewRef.current) await load(viewRef.current.month);
        setConflict(null);
        setFeedback({ kind: "success", message: `${label}を保存しました。` });
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.code === "Conflict") {
          if (e.latest && "days" in e.latest) setView(e.latest);
          setConflict({ label, retry: () => mutate(label, op) });
          setFeedback({ kind: "error", message: `他の端末で更新されているため、「${label}」は保存されていません。` });
        } else {
          const message = e instanceof Error ? e.message : "保存に失敗しました。";
          setFeedback({ kind: "error", message: `${message}（未保存）` });
        }
        return false;
      }
    },
    [load, setView],
  );

  const reloadLatest = async () => {
    if (viewRef.current) await load(viewRef.current.month);
    setConflict(null);
  };
  const reapply = async () => {
    const pending = conflict;
    if (viewRef.current) await load(viewRef.current.month);
    if (pending) await pending.retry();
  };

  const saveMissions = (label: string) => (definitions: MissionDefinitionInputDto[]) =>
    mutate(label, async (current) => {
      await api.configureMissions({ definitions, expectedVersion: current?.missionConfiguration?.version ?? null });
    }).then((ok) => {
      if (ok) setEditingMissions(false);
      return ok;
    });

  const conflictNotice = conflict && <ConflictNotice label={conflict.label} onReload={reloadLatest} onReapply={reapply} />;
  const feedbackNode = (
    <>
      <OperationFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      {!selectedDate && conflictNotice}
    </>
  );

  if (!view) {
    return (
      <AppShell feedback={feedbackNode}>
        {loadError ? (
          <section className="panel" role="alert">
            <p>{loadError}</p>
            <button type="button" className="button button-primary" onClick={() => void load(month)} data-testid="app-retry-load-button">
              再読み込み
            </button>
          </section>
        ) : (
          <p className="hint">読み込んでいます…</p>
        )}
      </AppShell>
    );
  }

  if (!view.missionConfiguration) {
    return (
      <AppShell feedback={feedbackNode}>
        <MissionSetupGate onSave={saveMissions("ミッションの登録")} />
      </AppShell>
    );
  }

  const selectedDay = selectedDate ? view.days.find((d) => d.date === selectedDate) : undefined;

  return (
    <AppShell feedback={feedbackNode}>
      {loadError && (
        <p className="field-error" role="alert">
          {loadError}
        </p>
      )}
      {editingMissions ? (
        <section className="panel" data-testid="mission-edit-panel">
          <h2 className="panel-title">ミッションの編集</h2>
          <MissionEditor
            initial={view.missionConfiguration.definitions}
            mode="edit"
            onSave={saveMissions("ミッションの変更")}
            onCancel={() => setEditingMissions(false)}
          />
        </section>
      ) : (
        <CalendarPage
          view={view}
          onPrev={() => setMonth((m) => addMonths(m, -1))}
          onNext={() => setMonth((m) => addMonths(m, 1))}
          onToday={() => setMonth(yearMonthOf(view.today))}
          onSelectDay={setSelectedDate}
          onEditMissions={() => setEditingMissions(true)}
          onSaveGoal={(goal) =>
            mutate("月間目標", (current) => api.saveGoal(view.month, { goal, expectedVersion: current?.version ?? null }))
          }
        />
      )}
      {selectedDay && (
        <DayDetailModal
          key={selectedDay.date}
          day={selectedDay}
          imageUrl={api.imageUrl}
          notice={conflictNotice}
          onClose={() => setSelectedDate(null)}
          onSaveWeight={(weightKg) =>
            mutate("体重", (current) => api.saveDay(selectedDay.date, { weightKg, expectedVersion: current?.version ?? null }))
          }
          onToggleMission={(missionId, completed) =>
            mutate("ミッションの達成状態", (current) =>
              api.saveDay(selectedDay.date, { missionCompletions: { [missionId]: completed }, expectedVersion: current?.version ?? null }),
            )
          }
          onAddImage={async (file) => {
            let blob: Blob;
            try {
              blob = await prepareImage(file);
            } catch (e) {
              setFeedback({ kind: "error", message: e instanceof Error ? e.message : "画像を処理できませんでした。" });
              return false;
            }
            return mutate("食事画像", (current) => api.uploadImage(selectedDay.date, blob, current?.version ?? null));
          }}
          onDeleteImage={(imageId) =>
            mutate("画像の削除", (current) => api.deleteImage(selectedDay.date, imageId, current?.version ?? null))
          }
        />
      )}
    </AppShell>
  );
}

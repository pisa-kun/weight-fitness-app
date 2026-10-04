import { useState } from "react";

/**
 * 古い版からの保存が拒否されたときの案内（BR-15, BR-16）。
 * 自動で上書きせず、利用者が「最新を読み込む」か「草稿を再適用して保存」を選ぶ。入力中の内容は破棄しない。
 */
export function ConflictNotice({
  label,
  onReload,
  onReapply,
}: {
  label: string;
  onReload: () => Promise<void>;
  onReapply: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="conflict-notice" role="alert" data-testid="conflict-notice">
      <h2 className="conflict-title">他の端末で更新されています</h2>
      <p>
        「{label}」は保存されていません。最新の記録を読み込んでから、入力した内容をもう一度保存してください。入力中の内容は残っています。
      </p>
      <div className="button-row">
        <button type="button" className="button" disabled={busy} onClick={run(onReload)} data-testid="conflict-notice-reload-button">
          最新を読み込む
        </button>
        <button type="button" className="button button-primary" disabled={busy} onClick={run(onReapply)} data-testid="conflict-notice-reapply-button">
          草稿を再適用して保存
        </button>
      </div>
    </section>
  );
}

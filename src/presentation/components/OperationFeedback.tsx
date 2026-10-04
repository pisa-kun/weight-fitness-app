export type Feedback =
  | { readonly kind: "pending"; readonly message: string }
  | { readonly kind: "success"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

/** 保存中・保存済み・未保存（再試行可能）を共通表示する（BR-22） */
export function OperationFeedback({ feedback, onDismiss }: { feedback: Feedback | null; onDismiss: () => void }) {
  return (
    <div role="status" aria-live="polite" className="feedback-region">
      {feedback && (
        <div className={`feedback feedback-${feedback.kind}`} data-testid={`operation-feedback-${feedback.kind}`}>
          <span className="feedback-mark" aria-hidden="true">
            {feedback.kind === "error" ? "!" : feedback.kind === "success" ? "✓" : "…"}
          </span>
          <span className="feedback-message">{feedback.message}</span>
          {feedback.kind !== "pending" && (
            <button type="button" className="button button-small" onClick={onDismiss} data-testid="operation-feedback-dismiss-button">
              閉じる
            </button>
          )}
        </div>
      )}
    </div>
  );
}

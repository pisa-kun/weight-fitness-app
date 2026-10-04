import type { ReactNode } from "react";

/** 共通レイアウト。未認証アクセスの注意を常時表示する（US-09, NFR-U-06） */
export function AppShell({ children, feedback }: { children: ReactNode; feedback?: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">体重・ミッション記録</h1>
      </header>
      <div className="app-feedback">{feedback}</div>
      <main className="app-main">{children}</main>
      <footer className="app-footer" data-testid="app-footer-access-notice">
        このアプリはログインなしで利用できます。URLを知っている人は、体重・ミッション・画像を閲覧・編集できます。URLの共有にご注意ください。
      </footer>
    </div>
  );
}

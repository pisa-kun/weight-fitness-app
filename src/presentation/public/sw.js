// PWAインストール用の最小サービスワーカー。
// オフライン利用は要件外のため、APIや画面をキャッシュしない（同期データの鮮度を優先, NFR-U-15）。
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

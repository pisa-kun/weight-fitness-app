import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Web UIはsrc/presentationをルートとし、dist/webへ出力する
export default defineConfig({
  root: fileURLToPath(new URL("./src/presentation", import.meta.url)),
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("./dist/web", import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    // ローカル開発ではAPIをdev-server（インメモリS3）へ転送する
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});

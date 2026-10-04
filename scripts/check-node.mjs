// Vite 8 は Node.js ^20.19 || >=22.12 が必要（node:util の styleText 等を使う）。
// 古いNodeで分かりにくいSyntaxErrorになる前に、明確なメッセージで止める。
const [major, minor] = process.versions.node.split(".").map(Number);
const ok = major > 22 || (major === 22 && minor >= 12);
if (!ok) {
  console.error(
    `Node.js ${process.versions.node} では実行できません。Node.js 22.12 以上（推奨: 22 LTS）を使用してください。` +
      " 例: nvm install 22 / volta install node@22",
  );
  process.exit(1);
}

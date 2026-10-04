import type { MissionDefinitionInputDto } from "../../shared/api-contract";
import { MissionEditor } from "./MissionEditor";

/** ミッション未設定時に初回登録を求め、1〜15件の保存まで日次利用を開始させない（BR-04） */
export function MissionSetupGate({ onSave }: { onSave: (definitions: MissionDefinitionInputDto[]) => Promise<boolean> }) {
  return (
    <section className="panel" data-testid="mission-setup-gate">
      <h2 className="panel-title">はじめに：デイリーミッションの登録</h2>
      <p>
        毎日達成したいミッションを登録すると、記録を始められます。登録した日（日本時間）からミッションの記録が始まります。
      </p>
      <MissionEditor initial={[]} mode="setup" onSave={onSave} />
    </section>
  );
}

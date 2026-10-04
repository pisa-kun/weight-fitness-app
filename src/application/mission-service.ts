import {
  createMissionConfiguration,
  reviseMissionConfiguration,
  validateMissionDefinitions,
} from "../domain/missions";
import { ok, type Result } from "../domain/result";
import type { MissionConfigView } from "../shared/api-contract";
import { checkVersion, today, type ServiceContext } from "./context";
import { toMissionConfigView } from "./views";

/** 初回設定・標準ミッションの追加/編集（US-02, US-04）。日別snapshotは月JSON側で遅延確定する */
export class MissionService {
  constructor(private readonly ctx: ServiceContext) {}

  async getConfiguration(): Promise<Result<MissionConfigView | null>> {
    const r = await this.ctx.missions.readConfiguration();
    if (!r.ok) return r;
    return ok(r.value.value && r.value.version ? toMissionConfigView(r.value.value, r.value.version) : null);
  }

  async configureMissions(definitions: unknown, expectedVersion: string | null): Promise<Result<MissionConfigView>> {
    const current = await this.ctx.missions.readConfiguration();
    if (!current.ok) return current;
    const version = checkVersion(current.value.version, expectedVersion);
    if (!version.ok) return version;

    const defs = validateMissionDefinitions(definitions, this.ctx.newId);
    if (!defs.ok) return defs;

    const date = today(this.ctx);
    const next = current.value.value
      ? reviseMissionConfiguration(current.value.value, defs.value, date)
      : createMissionConfiguration(defs.value, date);
    const written = await this.ctx.missions.writeConfiguration(next, expectedVersion);
    if (!written.ok) return written;
    return ok(toMissionConfigView(next, written.value));
  }
}

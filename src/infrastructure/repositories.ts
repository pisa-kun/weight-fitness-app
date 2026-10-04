import type { YearMonth } from "../domain/dates";
import type { ImageContentType } from "../domain/images";
import {
  deserializeMissionConfiguration,
  serializeMissionConfiguration,
  type MissionConfiguration,
} from "../domain/missions";
import { deserializeMonth, emptyMonth, serializeMonth, type MonthDocument } from "../domain/month-document";
import { fail, ok, type Result } from "../domain/result";
import { conditionFor, type ObjectStore } from "./object-store";

// 月JSON・Mission Configuration・画像オブジェクトのリポジトリ（C-04, C-05, C-08）

export interface Versioned<T> {
  readonly value: T;
  /** 未作成のオブジェクトはnull */
  readonly version: string | null;
}

const JSON_TYPE = "application/json; charset=utf-8";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const MISSION_CONFIGURATION_KEY = "config/mission-configuration.json";
export const monthKey = (ym: YearMonth) => `months/${ym}.json`;

export class MonthlyJsonRepository {
  constructor(private readonly store: ObjectStore) {}

  async readMonth(ym: YearMonth): Promise<Result<Versioned<MonthDocument>>> {
    const r = await this.store.get(monthKey(ym));
    if (!r.ok) return r;
    if (r.value === null) return ok({ value: emptyMonth(ym), version: null });
    const doc = deserializeMonth(decoder.decode(r.value.body), ym);
    if (!doc.ok) return doc;
    return ok({ value: doc.value, version: r.value.etag });
  }

  async writeMonth(ym: YearMonth, doc: MonthDocument, expectedVersion: string | null): Promise<Result<string>> {
    const r = await this.store.put(monthKey(ym), encoder.encode(serializeMonth(doc)), JSON_TYPE, conditionFor(expectedVersion));
    return r.ok ? ok(r.value.etag) : r;
  }
}

export class MissionConfigurationRepository {
  constructor(private readonly store: ObjectStore) {}

  async readConfiguration(): Promise<Result<Versioned<MissionConfiguration | null>>> {
    const r = await this.store.get(MISSION_CONFIGURATION_KEY);
    if (!r.ok) return r;
    if (r.value === null) return ok({ value: null, version: null });
    const config = deserializeMissionConfiguration(decoder.decode(r.value.body));
    if (!config.ok) return config;
    return ok({ value: config.value, version: r.value.etag });
  }

  async writeConfiguration(config: MissionConfiguration, expectedVersion: string | null): Promise<Result<string>> {
    const r = await this.store.put(
      MISSION_CONFIGURATION_KEY,
      encoder.encode(serializeMissionConfiguration(config)),
      JSON_TYPE,
      conditionFor(expectedVersion),
    );
    return r.ok ? ok(r.value.etag) : r;
  }
}

export interface ImageContent {
  readonly body: Uint8Array;
  readonly contentType: string;
}

export class ImageObjectStore {
  constructor(private readonly store: ObjectStore) {}

  async putImage(objectKey: string, body: Uint8Array, contentType: ImageContentType): Promise<Result<void>> {
    // imageIdは毎回新規採番するため、既存オブジェクトを上書きしないよう新規作成条件を付ける
    const r = await this.store.put(objectKey, body, contentType, { ifNoneMatch: "*" });
    return r.ok ? ok(undefined) : r;
  }

  async readImage(objectKey: string): Promise<Result<ImageContent>> {
    const r = await this.store.get(objectKey);
    if (!r.ok) return r;
    if (r.value === null) return fail("NotFound", "画像が見つかりません。");
    return ok({ body: r.value.body, contentType: r.value.contentType });
  }

  deleteImage(objectKey: string): Promise<Result<void>> {
    return this.store.delete(objectKey);
  }
}

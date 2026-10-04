// フロントエンドとAPIで共有する応答・要求の型（HTTP契約）

import type { AppErrorCode } from "../domain/result";

export type MissionKindDto = "mission" | "exercise";

export interface MissionDefinitionDto {
  readonly missionId: string;
  readonly title: string;
  readonly kind: MissionKindDto;
  readonly target: string | null;
}

export interface MissionStateDto {
  readonly missionId: string;
  readonly title: string;
  readonly kind: MissionKindDto;
  readonly target: string | null;
  readonly isCompleted: boolean;
}

export interface ImageDto {
  readonly imageId: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface DayView {
  readonly date: string;
  readonly weightKg: number | null;
  /** nullはミッション設定前（N/A） */
  readonly missions: readonly MissionStateDto[] | null;
  readonly images: readonly ImageDto[];
  readonly isComplete: boolean;
  readonly hasRecord: boolean;
}

export interface MissionConfigView {
  readonly setupDate: string;
  readonly revision: number;
  readonly definitions: readonly MissionDefinitionDto[];
  /** 楽観ロック用の版 */
  readonly version: string;
}

export interface MonthView {
  readonly month: string;
  /** 月JSONの版。未作成ならnull */
  readonly version: string | null;
  readonly monthlyGoal: string | null;
  /** Asia/Tokyoの今日 */
  readonly today: string;
  readonly days: readonly DayView[];
  readonly missionConfiguration: MissionConfigView | null;
}

export interface SaveDayRequest {
  readonly weightKg?: number | null;
  readonly missionCompletions?: Readonly<Record<string, boolean>>;
  readonly expectedVersion: string | null;
}

export interface SaveGoalRequest {
  readonly goal: string | null;
  readonly expectedVersion: string | null;
}

export interface MissionDefinitionInputDto {
  readonly missionId?: string | null;
  readonly title: string;
  readonly kind: MissionKindDto;
  readonly target: string | null;
}

export interface ConfigureMissionsRequest {
  readonly definitions: readonly MissionDefinitionInputDto[];
  readonly expectedVersion: string | null;
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: AppErrorCode;
    readonly message: string;
    readonly details?: Readonly<Record<string, string>>;
  };
  /** 409 Conflict時の最新状態 */
  readonly latest?: MonthView | MissionConfigView | null;
}

export const EXPECTED_VERSION_HEADER = "x-expected-version";

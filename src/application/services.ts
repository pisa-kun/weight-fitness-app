import { randomUUID } from "node:crypto";
import {
  ImageObjectStore,
  MissionConfigurationRepository,
  MonthlyJsonRepository,
} from "../infrastructure/repositories";
import type { ObjectStore } from "../infrastructure/object-store";
import { CalendarQueryService } from "./calendar-query-service";
import type { ServiceContext } from "./context";
import { DailyRecordService } from "./daily-record-service";
import { FoodImageService } from "./food-image-service";
import { MissionService } from "./mission-service";
import { MonthlyGoalService } from "./monthly-goal-service";

export interface AppServices {
  readonly calendar: CalendarQueryService;
  readonly dailyRecords: DailyRecordService;
  readonly missions: MissionService;
  readonly goals: MonthlyGoalService;
  readonly images: FoodImageService;
}

export interface CreateServicesOptions {
  readonly now?: () => Date;
  readonly newId?: () => string;
}

/** 1つのObjectStore（非公開S3またはインメモリ）から全サービスを組み立てる */
export function createServices(store: ObjectStore, options: CreateServicesOptions = {}): AppServices {
  const ctx: ServiceContext = {
    months: new MonthlyJsonRepository(store),
    missions: new MissionConfigurationRepository(store),
    images: new ImageObjectStore(store),
    now: options.now ?? (() => new Date()),
    newId: options.newId ?? (() => randomUUID()),
  };
  return {
    calendar: new CalendarQueryService(ctx),
    dailyRecords: new DailyRecordService(ctx),
    missions: new MissionService(ctx),
    goals: new MonthlyGoalService(ctx),
    images: new FoodImageService(ctx),
  };
}

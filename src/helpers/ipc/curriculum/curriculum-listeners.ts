import { ipcMain } from "electron";
import { CURRICULUM_CHANNELS } from "./curriculum-channels";
import {
  curriculumDB,
  type CurriculumPlan,
} from "../../../services/curriculum-database";

export function registerCurriculumListeners() {
  ipcMain.handle(CURRICULUM_CHANNELS.GET_ALL_PLANS, async () => {
    try {
      const plans = await curriculumDB.getAllPlans();
      return { success: true, data: { plans } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get plans",
      };
    }
  });

  ipcMain.handle(
    CURRICULUM_CHANNELS.GET_PLAN_BY_CLASS,
    async (_, className: string) => {
      try {
        const plan = await curriculumDB.getPlanByClass(className);
        return { success: true, data: plan };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get plan",
        };
      }
    },
  );

  ipcMain.handle(
    CURRICULUM_CHANNELS.SAVE_PLAN,
    async (_, plan: CurriculumPlan) => {
      try {
        await curriculumDB.savePlan(plan);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to save plan",
        };
      }
    },
  );

  ipcMain.handle(CURRICULUM_CHANNELS.DELETE_PLAN, async (_, planId: string) => {
    try {
      await curriculumDB.deletePlan(planId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete plan",
      };
    }
  });
}

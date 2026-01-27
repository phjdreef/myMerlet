import { contextBridge, ipcRenderer } from "electron";
import { CURRICULUM_CHANNELS } from "./curriculum-channels";

export const curriculumAPI = {
  getAllPlans: () => ipcRenderer.invoke(CURRICULUM_CHANNELS.GET_ALL_PLANS),
  getPlanByClass: (className: string) =>
    ipcRenderer.invoke(CURRICULUM_CHANNELS.GET_PLAN_BY_CLASS, className),
  savePlan: (plan: unknown) =>
    ipcRenderer.invoke(CURRICULUM_CHANNELS.SAVE_PLAN, plan),
  deletePlan: (planId: string) =>
    ipcRenderer.invoke(CURRICULUM_CHANNELS.DELETE_PLAN, planId),
  exportPlanToDocx: (
    planId: string,
    language: "nl" | "en",
    className?: string,
  ) =>
    ipcRenderer.invoke(
      CURRICULUM_CHANNELS.EXPORT_PLAN_DOCX,
      planId,
      language,
      className,
    ),
};

contextBridge.exposeInMainWorld("curriculumAPI", curriculumAPI);

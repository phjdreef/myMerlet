import { app } from "electron";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";
import { getCurrentSchoolYear, type SchoolYear } from "../utils/school-year";
import type { BlockedWeek } from "./curriculum-database";

export type GlobalSettings = {
  theme?: "system" | "twitter" | "graphite" | "nord" | "dracula" | "solarized";
  currentSchoolYear?: SchoolYear;
  globalBlockedWeeks?: BlockedWeek[];
};

class GlobalSettingsManager {
  private settingsPath: string;
  private initialized = false;

  constructor() {
    this.settingsPath = "";
  }

  private getSettingsPath(): string {
    if (!this.settingsPath) {
      try {
        const userDataPath = app.getPath("userData");
        this.settingsPath = path.join(userDataPath, "global_settings.json");
        logger.debug("Global settings will be stored at:", this.settingsPath);
      } catch (error) {
        logger.error("Failed to get user data path:", error);
        this.settingsPath = path.join(process.cwd(), "global_settings.json");
        logger.debug("Using fallback global settings path:", this.settingsPath);
      }
    }
    return this.settingsPath;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const settingsPath = this.getSettingsPath();
      const settingsDir = path.dirname(settingsPath);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
        logger.debug("Created global settings directory:", settingsDir);
      }
      if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify({}, null, 2));
        logger.debug("Created initial global settings file");
      }
      this.initialized = true;
    } catch (error) {
      logger.error("Failed to initialize global settings:", error);
      throw new Error("Global settings initialization failed");
    }
  }

  private readSettings(): GlobalSettings {
    const settingsPath = this.getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return {};
    }
    try {
      const data = fs.readFileSync(settingsPath, "utf8");
      return JSON.parse(data) as GlobalSettings;
    } catch (error) {
      logger.error("Failed to read global settings:", error);
      return {};
    }
  }

  private writeSettings(settings: GlobalSettings): void {
    const settingsPath = this.getSettingsPath();
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
      logger.error("Failed to write global settings:", error);
      throw new Error("Failed to write to global settings file");
    }
  }

  async getTheme(): Promise<
    | "system"
    | "twitter"
    | "graphite"
    | "nord"
    | "dracula"
    | "solarized"
    | undefined
  > {
    if (!this.initialized) await this.init();
    const settings = this.readSettings();
    return settings.theme;
  }

  async setTheme(
    theme: "system" | "twitter" | "graphite" | "nord" | "dracula" | "solarized",
  ): Promise<void> {
    if (!this.initialized) await this.init();
    const settings = this.readSettings();
    settings.theme = theme;
    this.writeSettings(settings);
  }

  async getCurrentSchoolYear(): Promise<SchoolYear> {
    if (!this.initialized) await this.init();
    const settings = this.readSettings();
    // Return stored school year or default to current
    return settings.currentSchoolYear || getCurrentSchoolYear();
  }

  async setCurrentSchoolYear(schoolYear: SchoolYear): Promise<void> {
    if (!this.initialized) await this.init();
    const settings = this.readSettings();
    settings.currentSchoolYear = schoolYear;
    this.writeSettings(settings);
  }

  async getGlobalBlockedWeeks(): Promise<BlockedWeek[]> {
    if (!this.initialized) await this.init();
    const settings = this.readSettings();
    return settings.globalBlockedWeeks || [];
  }

  async setGlobalBlockedWeeks(blockedWeeks: BlockedWeek[]): Promise<void> {
    if (!this.initialized) await this.init();
    const settings = this.readSettings();
    settings.globalBlockedWeeks = blockedWeeks;
    this.writeSettings(settings);
  }
}

export const globalSettings = new GlobalSettingsManager();

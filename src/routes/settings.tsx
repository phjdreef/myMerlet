import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import LangToggle from "@/components/LangToggle";
import ToggleTheme from "@/components/ToggleTheme";
import { ThemeSelector } from "@/components/ui/ThemeSelector";
import { SchoolYearSelector } from "@/components/settings/SchoolYearSelector";
import MagisterDashboard from "@/components/MagisterDashboard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type TabType = "general" | "integrations";

function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("general");

  return (
    <div className="flex h-full flex-col">
      {/* Header with title and tabs */}
      <div className="bg-background border-b px-6 py-4">
        <h1 className="mb-4 text-2xl font-bold">{t("settings")}</h1>

        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(value) => {
            if (value) setActiveTab(value as TabType);
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="general" aria-label="Algemeen">
            Algemeen
          </ToggleGroupItem>
          <ToggleGroupItem value="integrations" aria-label={t("koppelingen")}>
            {t("koppelingen")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {activeTab === "general" && (
          <div className="container mx-auto flex h-full flex-col gap-6 px-6 py-8">
            <div className="grid gap-4 md:grid-cols-2">
              <section className="border-border/60 bg-card/80 flex flex-col gap-4 rounded-2xl border p-6 shadow-sm backdrop-blur">
                <div>
                  <h2 className="text-xl font-semibold">
                    {t("currentSchoolYear")}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {t("schoolYearDescription")}
                  </p>
                </div>
                <SchoolYearSelector />
              </section>

              <section className="border-border/60 bg-card/80 flex flex-col gap-4 rounded-2xl border p-6 shadow-sm backdrop-blur">
                <div>
                  <h2 className="text-xl font-semibold">{t("language")}</h2>
                  <p className="text-muted-foreground text-sm">
                    {t("languageDescription")}
                  </p>
                </div>
                <LangToggle />
              </section>

              <section className="border-border/60 bg-card/80 flex flex-col gap-5 rounded-2xl border p-6 shadow-sm backdrop-blur md:col-span-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{t("theme")}</h2>
                    <p className="text-muted-foreground text-sm">
                      {t("themeDescription")}
                    </p>
                  </div>
                  <ToggleTheme />
                </div>

                <ThemeSelector variant="cards" />
              </section>
            </div>
          </div>
        )}

        {activeTab === "integrations" && (
          <div className="container mx-auto flex flex-col gap-6 px-6 py-8">
            <MagisterDashboard />
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

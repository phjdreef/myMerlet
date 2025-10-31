import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import LangToggle from "@/components/LangToggle";
import ToggleTheme from "@/components/ToggleTheme";
import { ThemeSelector } from "@/components/ui/ThemeSelector";
import { SchoolYearSelector } from "@/components/settings/SchoolYearSelector";

function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto flex h-full flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("settings")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("settingsDescription")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border-border/60 bg-card/80 flex flex-col gap-4 rounded-2xl border p-6 shadow-sm backdrop-blur">
          <div>
            <h2 className="text-xl font-semibold">{t("currentSchoolYear")}</h2>
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
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

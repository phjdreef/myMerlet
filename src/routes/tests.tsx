import { createFileRoute } from "@tanstack/react-router";
import { TestsOverview } from "../components/tests/TestsOverview";
import { useTranslation } from "react-i18next";

function TestsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto flex h-full flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("tests")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("testsTabDescription")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <TestsOverview />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/tests")({
  component: TestsPage,
});

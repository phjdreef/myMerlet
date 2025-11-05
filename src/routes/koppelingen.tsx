import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import MagisterDashboard from "@/components/MagisterDashboard";
import ExamnetDashboard from "@/components/ExamnetDashboard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type TabType = "magister" | "examnet";

function KoppelingenPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("magister");

  return (
    <div className="flex h-full flex-col">
      {/* Header with title and tabs */}
      <div className="bg-background border-b px-6 py-4">
        <h1 className="mb-4 text-2xl font-bold">{t("koppelingen")}</h1>

        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(value) => {
            if (value) setActiveTab(value as TabType);
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="magister" aria-label="Magister">
            Magister
          </ToggleGroupItem>
          <ToggleGroupItem value="examnet" aria-label="Exam.net">
            Exam.net
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {activeTab === "magister" && <MagisterDashboard />}
        {activeTab === "examnet" && <ExamnetDashboard />}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/koppelingen")({
  component: KoppelingenPage,
});

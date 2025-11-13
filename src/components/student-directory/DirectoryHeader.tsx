import {
  ListIcon,
  ChalkboardTeacherIcon,
  BooksIcon,
  ExamIcon,
} from "@phosphor-icons/react";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { useTranslation } from "react-i18next";

export type ViewMode = "list" | "classroom" | "plans" | "grades";

interface DirectoryHeaderProps {
  visibleCount: number;
  selectedClass: string | null;
  viewMode: ViewMode;
  loading: boolean;
  onViewModeChange: (mode: ViewMode) => void;
}

export function DirectoryHeader({
  visibleCount,
  selectedClass,
  viewMode,
  loading,
  onViewModeChange,
}: DirectoryHeaderProps) {
  const { t } = useTranslation();

  const handleViewChange = (value: string) => {
    if (!value) {
      return;
    }
    onViewModeChange(value as ViewMode);
  };

  const subtitle = selectedClass
    ? t("studentsInClass", { count: visibleCount })
    : t("selectClassLabel");

  return (
    <div className="border-border/60 bg-card/80 rounded-2xl border p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("classes")}
            </h1>
            {selectedClass && (
              <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-sm font-medium">
                {selectedClass}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          {/* View mode tabs moved here */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewChange}
            className="border-border/60 bg-background/60 rounded-xl border p-1 shadow-sm"
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem
              value="list"
              disabled={loading}
              className="min-w-[130px]"
            >
              <ListIcon className="h-4 w-4" weight="regular" />
              {t("listView")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="classroom"
              disabled={loading || !selectedClass}
              className="min-w-[130px]"
            >
              <ChalkboardTeacherIcon className="h-4 w-4" weight="regular" />
              {t("floorPlan")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="plans"
              disabled={loading || !selectedClass}
              className="min-w-[130px]"
            >
              <BooksIcon className="h-4 w-4" weight="regular" />
              {t("planning")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="grades"
              disabled={loading || !selectedClass}
              className="min-w-[130px]"
            >
              <ExamIcon className="h-4 w-4" weight="regular" />
              {t("gradesView")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}

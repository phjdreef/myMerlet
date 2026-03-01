import { useTranslation } from "react-i18next";
import type { StudentPropertyDefinition } from "@/services/student-database";
import type { Test } from "@/services/test-database";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortDirection } from "./types";

interface StudentTableHeaderProps {
  recentTests: Test[];
  propertyDefinitions: StudentPropertyDefinition[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  filters: Map<string, string>;
  levelOptions: string[];
  onSort: (column: string) => void;
  onFilterChange: (column: string, value: string) => void;
}

export function StudentTableHeader({
  recentTests,
  propertyDefinitions,
  sortColumn,
  sortDirection,
  filters,
  levelOptions,
  onSort,
  onFilterChange,
}: StudentTableHeaderProps) {
  const { t } = useTranslation();

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-16">{t("photo")}</TableHead>
        <TableHead className="min-w-[150px]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSort("name")}
                className="hover:text-foreground flex items-center gap-1"
              >
                {t("studentName")}
                {sortColumn === "name" && (
                  <span className="text-xs">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={() => onSort("lastName")}
                className="hover:text-foreground flex items-center gap-1 text-xs"
              >
                {t("lastName")}
                {sortColumn === "lastName" && (
                  <span className="text-xs">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
            </div>
            <Input
              placeholder={t("filter")}
              value={filters.get("name") || ""}
              onChange={(e) => onFilterChange("name", e.target.value)}
              className="mb-2 h-7 text-xs"
            />
          </div>
        </TableHead>
        <TableHead className="w-44 min-w-44 px-2">
          <div className="space-y-1">
            <button
              onClick={() => onSort("level")}
              className="hover:text-foreground flex items-center gap-1"
            >
              {t("level")}
              {sortColumn === "level" && (
                <span className="text-xs">
                  {sortDirection === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
            <Select
              value={filters.get("level") || "all"}
              onValueChange={(value) =>
                onFilterChange("level", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="mb-2 h-7 w-[132px] text-xs">
                <SelectValue placeholder={t("all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                {levelOptions.map((niveau) => (
                  <SelectItem key={niveau} value={niveau.toLowerCase()}>
                    {niveau}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TableHead>
        {recentTests.length > 0 ? (
          <>
            {recentTests.map((test) => (
              <TableHead key={test.id} className="w-24 text-center">
                <span className="text-xs">{test.name}</span>
              </TableHead>
            ))}
            <TableHead className="w-24 text-center">
              <button
                onClick={() => onSort("average")}
                className="hover:text-foreground mx-auto flex items-center gap-1"
              >
                {t("studentAverage")}
                {sortColumn === "average" && (
                  <span className="text-xs">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
            </TableHead>
          </>
        ) : (
          <>
            <TableHead className="w-24 text-center">
              {t("lastGrade1")}
            </TableHead>
            <TableHead className="w-24 text-center">
              {t("lastGrade2")}
            </TableHead>
            <TableHead className="w-24 text-center">
              {t("studentAverage")}
            </TableHead>
          </>
        )}
        {propertyDefinitions.map((prop) => (
          <TableHead
            key={prop.id}
            className={prop.type === "boolean" ? "w-16" : "min-w-[120px]"}
          >
            <div className="space-y-1">
              <button
                onClick={() => onSort(`prop_${prop.id}`)}
                className="hover:text-foreground flex items-center gap-1"
              >
                {prop.name}
                {sortColumn === `prop_${prop.id}` && (
                  <span className="text-xs">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
              {prop.type !== "boolean" && (
                <Input
                  placeholder={t("filter")}
                  value={filters.get(`prop_${prop.id}`) || ""}
                  onChange={(e) =>
                    onFilterChange(`prop_${prop.id}`, e.target.value)
                  }
                  className="mb-2 h-7 text-xs"
                />
              )}
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

import type { ChangeEvent } from "react";
import type { StudentPropertyDefinition } from "@/services/student-database";
import type { Test } from "@/services/test-database";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentPhoto } from "../StudentPhoto";
import {
  LEVEL_OVERRIDE_OPTIONS,
  LEVEL_OVERRIDE_PROPERTY_ID,
} from "@/helpers/student_helpers";
import type { StudentWithExtras } from "./types";

interface StudentTableRowProps {
  student: StudentWithExtras;
  recentTests: Test[];
  propertyDefinitions: StudentPropertyDefinition[];
  getFullName: (student: StudentWithExtras) => string;
  getDefaultNiveau: (student: StudentWithExtras) => string;
  getDefaultNiveauCode: (student: StudentWithExtras) => string | null;
  onPropertyValueChange: (
    student: StudentWithExtras,
    propertyId: string,
    value: string | number | boolean,
  ) => void;
  onTextareaChange: (
    e: ChangeEvent<HTMLTextAreaElement>,
    student: StudentWithExtras,
    propertyId: string,
  ) => void;
  getGradeColor: (grade: number) => string;
}

export function StudentTableRow({
  student,
  recentTests,
  propertyDefinitions,
  getFullName,
  getDefaultNiveau,
  getDefaultNiveauCode,
  onPropertyValueChange,
  onTextareaChange,
  getGradeColor,
}: StudentTableRowProps) {
  return (
    <TableRow key={student.id} className="group/row">
      <TableCell className="relative">
        <div className="h-10 w-10">
          <StudentPhoto student={student} size="small" />
        </div>
      </TableCell>

      <TableCell className="font-medium">{getFullName(student)}</TableCell>

      <TableCell className="w-44 min-w-44 px-1.5 py-1.5 text-sm">
        <div>
          {(() => {
            const rawOverride = student.propertyValues.get(
              LEVEL_OVERRIDE_PROPERTY_ID,
            );
            const overrideValue =
              typeof rawOverride === "string"
                ? rawOverride.trim().toUpperCase()
                : "";
            const defaultCode = getDefaultNiveauCode(student);
            const selectValue = overrideValue || defaultCode || "unknown";

            return (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-xs">
                  {getDefaultNiveau(student)}
                </span>
                <Select
                  value={selectValue}
                  onValueChange={(value) => {
                    if (value === "unknown") return;

                    const nextValue =
                      defaultCode && value === defaultCode ? "" : value;

                    onPropertyValueChange(
                      student,
                      LEVEL_OVERRIDE_PROPERTY_ID,
                      nextValue,
                    );
                  }}
                >
                  <SelectTrigger className="h-7 w-[132px] text-xs">
                    <SelectValue placeholder={getDefaultNiveau(student)} />
                  </SelectTrigger>
                  <SelectContent>
                    {!defaultCode && <SelectItem value="unknown">-</SelectItem>}
                    {LEVEL_OVERRIDE_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })()}
        </div>
      </TableCell>

      {recentTests.length > 0 ? (
        <>
          {student.recentGrades.map((gradeInfo, idx) => (
            <TableCell key={idx} className="text-center">
              {gradeInfo ? (
                <span
                  className={getGradeColor(
                    gradeInfo.grade.manualOverride ??
                      gradeInfo.grade.calculatedGrade,
                  )}
                >
                  {(
                    gradeInfo.grade.manualOverride ??
                    gradeInfo.grade.calculatedGrade
                  ).toFixed(1)}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
          ))}
          <TableCell className="text-center">
            {student.average !== null ? (
              <span className={getGradeColor(student.average)}>
                {student.average.toFixed(1)}
              </span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="text-muted-foreground text-center text-sm">
            -
          </TableCell>
          <TableCell className="text-muted-foreground text-center text-sm">
            -
          </TableCell>
          <TableCell className="text-muted-foreground text-center text-sm">
            -
          </TableCell>
        </>
      )}

      {propertyDefinitions.map((prop) => (
        <TableCell key={prop.id} className="relative z-10">
          {prop.type === "boolean" ? (
            <Checkbox
              checked={
                (student.propertyValues.get(prop.id) as boolean) || false
              }
              onCheckedChange={(checked: boolean) =>
                onPropertyValueChange(student, prop.id, checked === true)
              }
              className="relative z-10"
            />
          ) : prop.type === "number" ? (
            <Input
              type="number"
              value={
                (student.propertyValues.get(prop.id) as number | string) || ""
              }
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onPropertyValueChange(
                  student,
                  prop.id,
                  parseFloat(e.target.value) || 0,
                )
              }
              className="h-8 w-20"
            />
          ) : prop.type === "letter" ? (
            <Input
              type="text"
              maxLength={1}
              value={(student.propertyValues.get(prop.id) as string) || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onPropertyValueChange(student, prop.id, e.target.value)
              }
              className="h-8 w-12 text-center"
            />
          ) : prop.type === "longtext" ? (
            <textarea
              ref={(element) => {
                if (!element) return;
                element.style.height = "auto";
                element.style.height = `${element.scrollHeight}px`;
              }}
              value={(student.propertyValues.get(prop.id) as string) || ""}
              onChange={(e) => onTextareaChange(e, student, prop.id)}
              placeholder="..."
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none overflow-hidden rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
              style={{
                minHeight: "2.5rem",
              }}
            />
          ) : (
            <Input
              type="text"
              value={(student.propertyValues.get(prop.id) as string) || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onPropertyValueChange(student, prop.id, e.target.value)
              }
              className="h-8"
            />
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}

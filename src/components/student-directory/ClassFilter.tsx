import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import type { Student } from "../../services/student-database";
import { formatClassName } from "../../utils/class-utils";

interface ClassFilterProps {
  students: Student[];
  availableClasses: string[];
  selectedClass: string | null;
  onClassSelect: (className: string | null) => void;
}

export function ClassFilter({
  students,
  availableClasses,
  selectedClass,
  onClassSelect,
}: ClassFilterProps) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem("class_filter_width");
    return saved ? parseInt(saved, 10) : 256;
  });
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(500, e.clientX));
      setWidth(newWidth);
      localStorage.setItem("class_filter_width", newWidth.toString());
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      className="border-border bg-card relative border-r p-4"
      style={{ width: `${width}px`, minWidth: "180px", maxWidth: "500px" }}
    >
      <h2 className="mb-4 text-lg font-semibold">{t("classes")}</h2>

      <div className="space-y-2">
        {/* Individual Classes */}
        {availableClasses.map((className) => {
          const classStudentCount = students.filter(
            (student) => student.klassen && student.klassen.includes(className),
          ).length;

          return (
            <button
              key={className}
              onClick={() => onClassSelect(className)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedClass === className
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {formatClassName(className)} ({classStudentCount})
            </button>
          );
        })}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="hover:bg-primary/30 active:bg-primary/50 absolute top-0 right-0 h-full w-2 cursor-col-resize"
        style={{
          background: isResizing ? "var(--primary)" : "transparent",
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}

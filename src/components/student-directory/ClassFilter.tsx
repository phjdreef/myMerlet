import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import type { Student } from "../../services/student-database";
import { formatClassName } from "../../utils/class-utils";

interface ClassFilterProps {
  students: Student[];
  allClasses: string[];
  availableClasses: string[];
  inactiveClasses: string[];
  selectedClass: string | null;
  onClassSelect: (className: string | null) => void;
  onClassActiveChange: (className: string, isActive: boolean) => void;
  onClassOrderChange: (classNames: string[]) => void;
}

export function ClassFilter({
  students,
  allClasses,
  availableClasses,
  inactiveClasses,
  selectedClass,
  onClassSelect,
  onClassActiveChange,
  onClassOrderChange,
}: ClassFilterProps) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem("class_filter_width");
    return saved ? parseInt(saved, 10) : 256;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingClasses, setIsEditingClasses] = useState(false);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(
    null,
  );
  const draggedClassNameRef = useRef<string | null>(null);
  const inactiveSet = new Set(inactiveClasses);
  const visibleClassNames = isEditingClasses ? allClasses : availableClasses;

  const handleClassDropAtIndex = (targetIndex: number) => {
    const dragged = draggedClassNameRef.current;
    if (!dragged) {
      return;
    }

    const current = [...allClasses];
    const fromIndex = current.indexOf(dragged);
    if (fromIndex < 0) {
      return;
    }

    const boundedTargetIndex = Math.max(
      0,
      Math.min(targetIndex, current.length),
    );
    let insertIndex = boundedTargetIndex;
    if (fromIndex < insertIndex) {
      insertIndex -= 1;
    }

    if (insertIndex === fromIndex) {
      return;
    }

    const [moved] = current.splice(fromIndex, 1);
    current.splice(insertIndex, 0, moved);
    onClassOrderChange(current);
  };

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
      className="border-border bg-card relative flex h-full flex-col border-r p-4"
      style={{ width: `${width}px`, minWidth: "180px", maxWidth: "500px" }}
    >
      <h2 className="mb-4 text-lg font-semibold">{t("classes")}</h2>

      {isEditingClasses && (
        <p className="text-muted-foreground mb-3 text-xs">
          Zet klassen op inactief om ze te verbergen uit de klaslijst.
        </p>
      )}

      <div className="flex-1 space-y-2 overflow-auto pr-2">
        {visibleClassNames.map((className, index) => {
          const classStudentCount = students.filter(
            (student) =>
              (Array.isArray(student.klassen) &&
                student.klassen.includes(className)) ||
              (Array.isArray(student.lesgroepen) &&
                student.lesgroepen.includes(className)),
          ).length;
          const isActive = !inactiveSet.has(className);

          return (
            <div key={className}>
              {isEditingClasses && dropIndicatorIndex === index && (
                <div className="bg-primary mb-1 h-0.5 w-full rounded-full" />
              )}

              <div
                draggable={isEditingClasses}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", className);
                  event.dataTransfer.effectAllowed = "move";
                  draggedClassNameRef.current = className;
                }}
                onDragOver={(event) => {
                  if (!isEditingClasses) {
                    return;
                  }

                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";

                  const rect = event.currentTarget.getBoundingClientRect();
                  const isBelowMidpoint =
                    event.clientY > rect.top + rect.height / 2;
                  setDropIndicatorIndex(isBelowMidpoint ? index + 1 : index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (isEditingClasses) {
                    const transferred =
                      event.dataTransfer.getData("text/plain");
                    if (transferred) {
                      draggedClassNameRef.current = transferred;
                    }

                    const rect = event.currentTarget.getBoundingClientRect();
                    const isBelowMidpoint =
                      event.clientY > rect.top + rect.height / 2;
                    const computedDropIndex = isBelowMidpoint
                      ? index + 1
                      : index;

                    handleClassDropAtIndex(
                      dropIndicatorIndex ?? computedDropIndex,
                    );
                  }
                  setDropIndicatorIndex(null);
                }}
                onDragEnd={() => {
                  draggedClassNameRef.current = null;
                  setDropIndicatorIndex(null);
                }}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  selectedClass === className
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                } ${isEditingClasses && !isActive ? "opacity-60" : ""} ${
                  isEditingClasses ? "cursor-move" : ""
                }`}
              >
                <div
                  onClick={() => onClassSelect(className)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onClassSelect(className);
                    }
                  }}
                >
                  {formatClassName(className)} ({classStudentCount})
                </div>

                {isEditingClasses && (
                  <div
                    className="text-muted-foreground cursor-grab px-1 text-sm select-none active:cursor-grabbing"
                    title="Sleep om te verplaatsen"
                  >
                    ⋮⋮
                  </div>
                )}

                {isEditingClasses && (
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-black"
                    draggable={false}
                    checked={isActive}
                    onChange={(event) =>
                      onClassActiveChange(className, event.target.checked)
                    }
                  />
                )}
              </div>
            </div>
          );
        })}

        {isEditingClasses &&
          dropIndicatorIndex === visibleClassNames.length && (
            <div className="bg-primary h-0.5 w-full rounded-full" />
          )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <button
          onClick={() => setIsEditingClasses((previous) => !previous)}
          className="text-muted-foreground hover:text-foreground rounded px-2 py-1 text-xs"
        >
          {isEditingClasses ? "Klaar" : "Bewerk lijst"}
        </button>
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

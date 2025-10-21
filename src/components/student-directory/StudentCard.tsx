import type { Student } from "../../services/student-database";
import { StudentPhoto } from "./StudentPhoto";

interface StudentCardProps {
  student: Student;
}

export function StudentCard({ student }: StudentCardProps) {
  const formatName = (student: Student) => {
    let name = `${student.voorletters} `;
    if (student.tussenvoegsel) {
      name += `${student.tussenvoegsel} `;
    }
    name += student.achternaam;
    return name;
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="mb-3 flex gap-3">
        {/* Student Photo */}
        <div className="flex-shrink-0">
          <StudentPhoto student={student} />
        </div>

        {/* Student Info */}
        <div className="flex-grow">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium">{student.roepnaam}</h3>
              <p className="text-muted-foreground text-sm">
                {formatName(student)}
              </p>
            </div>
            <span className="bg-secondary rounded px-2 py-1 text-xs">
              ID: {student.id}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <strong>Code:</strong> {student.code}
        </p>
        <p>
          <strong>Email:</strong> {student.emailadres}
        </p>

        {student.klassen && student.klassen.length > 0 && (
          <p>
            <strong>Classes:</strong> {student.klassen.join(", ")}
          </p>
        )}

        {student.studies && student.studies.length > 0 && (
          <p>
            <strong>Studies:</strong> {student.studies.join(", ")}
          </p>
        )}
      </div>

      <div className="mt-3 border-t pt-2">
        <p className="text-muted-foreground text-xs">
          External ID: {student.externeId}
        </p>
      </div>
    </div>
  );
}

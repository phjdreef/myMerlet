import { createFileRoute } from "@tanstack/react-router";
import StudentDirectory from "@/components/StudentDirectory";

function StudentsPage() {
  return (
    <div className="h-full">
      <StudentDirectory />
    </div>
  );
}

export const Route = createFileRoute("/students")({
  component: StudentsPage,
});

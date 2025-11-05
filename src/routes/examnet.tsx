import { createFileRoute } from "@tanstack/react-router";
import ExamnetDashboard from "@/components/ExamnetDashboard";

function ExamnetPage() {
  return (
    <div className="h-full">
      <ExamnetDashboard />
    </div>
  );
}

export const Route = createFileRoute("/examnet")({
  component: ExamnetPage,
});

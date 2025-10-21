import { createFileRoute } from "@tanstack/react-router";
import MagisterDashboard from "@/components/MagisterDashboard";

function MagisterPage() {
  return (
    <div className="h-full">
      <MagisterDashboard />
    </div>
  );
}

export const Route = createFileRoute("/magister")({
  component: MagisterPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { CurriculumPlanner } from "../components/CurriculumPlanner";

export const Route = createFileRoute("/planning")({
  component: PlanningPage,
});

function PlanningPage() {
  return <CurriculumPlanner />;
}

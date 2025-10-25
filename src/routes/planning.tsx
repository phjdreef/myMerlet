import { createFileRoute } from "@tanstack/react-router";
import { PlanningTabs } from "../components/planning/PlanningTabs";

export const Route = createFileRoute("/planning")({
  component: PlanningPage,
});

function PlanningPage() {
  return <PlanningTabs />;
}

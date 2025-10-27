import { Navigate, createFileRoute } from "@tanstack/react-router";

function DeprecatedSecondPage() {
  return <Navigate to="/settings" />;
}

export const Route = createFileRoute("/second")({
  component: DeprecatedSecondPage,
});

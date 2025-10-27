import { Navigate, createFileRoute } from "@tanstack/react-router";

function RedirectToStudents() {
  return <Navigate to="/students" />;
}

export const Route = createFileRoute("/")({
  component: RedirectToStudents,
});

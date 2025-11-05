import { routeTree } from "@/routeTree.gen";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Persist the current route in localStorage
const LAST_ROUTE_KEY = "lastRoute";

// Get the last visited route or default to "/"
const getInitialRoute = () => {
  try {
    return localStorage.getItem(LAST_ROUTE_KEY) || "/";
  } catch {
    return "/";
  }
};

// Create history with the last visited route
const history = createMemoryHistory({
  initialEntries: [getInitialRoute()],
});

export const router = createRouter({
  defaultPendingMinMs: 0,
  routeTree,
  history,
});

// Save the current route whenever it changes
router.subscribe("onLoad", ({ toLocation }) => {
  try {
    localStorage.setItem(LAST_ROUTE_KEY, toLocation.pathname);
  } catch (error) {
    console.error("Failed to save route:", error);
  }
});

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { syncThemeWithLocal } from "./helpers/theme_helpers";
import { useTranslation } from "react-i18next";
import { updateAppLanguage } from "./helpers/language_helpers";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./utils/routes";
import { SchoolYearProvider } from "./contexts/SchoolYearContext";
import "./localization/i18n";

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    syncThemeWithLocal();
    updateAppLanguage(i18n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, not when i18n changes

  return (
    <SchoolYearProvider>
      <RouterProvider router={router} />
    </SchoolYearProvider>
  );
}

const root = createRoot(document.getElementById("app")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

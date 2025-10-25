import { themes } from "@/themes/themes";
import { useEffect, useState, useCallback } from "react";

export function ThemeSelector() {
  // Map theme name to index for selection
  const themeNameToIdx = (name: string) => {
    const idx = themes.findIndex(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    return idx === -1 ? 0 : idx;
  };

  const applyTheme = useCallback((themeKey: string) => {
    const idx = themeNameToIdx(themeKey);
    const theme = themes[idx];
    document.body.classList.remove(...themes.map((t) => t.className));
    document.body.classList.add(theme.className);
    Object.entries(theme.variables).forEach(([key, value]) => {
      document.body.style.setProperty(key, value);
    });
  }, []);

  const [selected, setSelected] = useState(0);
  // On mount, get global theme
  useEffect(() => {
    (async () => {
      if (window.themeGlobal) {
        const globalTheme = await window.themeGlobal.get();
        if (globalTheme) {
          // Map to index: "system" | "twitter" | "graphite"
          setSelected(themeNameToIdx(globalTheme));
          applyTheme(globalTheme);
        }
      }
    })();
  }, [applyTheme]);

  const handleChange = async (idx: number) => {
    setSelected(idx);
    const themeKey = themes[idx].name.toLowerCase();
    applyTheme(themeKey);
    if (window.themeGlobal) {
      await window.themeGlobal.set(
        themeKey as
          | "system"
          | "twitter"
          | "graphite"
          | "nord"
          | "dracula"
          | "solarized",
      );
    }
  };

  return (
    <div className="flex min-w-32 flex-col gap-1">
      {themes.map((theme, idx) => (
        <button
          key={theme.name}
          className={`rounded border px-2 py-1 text-left text-xs transition-colors duration-100 ${selected === idx ? "bg-primary text-white" : "bg-muted hover:bg-accent"}`}
          onClick={() => handleChange(idx)}
        >
          {theme.name}
        </button>
      ))}
    </div>
  );
}

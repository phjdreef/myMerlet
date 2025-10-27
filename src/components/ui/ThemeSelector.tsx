import { themes } from "@/themes/themes";
import { cn } from "@/utils/tailwind";
import { useEffect, useState, useCallback } from "react";

const ALL_THEME_VARIABLES = Array.from(
  new Set(themes.flatMap((theme) => Object.keys(theme.variables ?? {}))),
);

type ThemeSelectorVariant = "list" | "cards";

interface ThemeSelectorProps {
  variant?: ThemeSelectorVariant;
}

export function ThemeSelector({ variant = "list" }: ThemeSelectorProps) {
  const themeNameToIdx = useCallback((name: string) => {
    const idx = themes.findIndex(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    return idx === -1 ? 0 : idx;
  }, []);

  const applyTheme = useCallback(
    (themeKey: string) => {
      const idx = themeNameToIdx(themeKey);
      const theme = themes[idx];

      document.body.classList.remove(...themes.map((t) => t.className));

      ALL_THEME_VARIABLES.forEach((variable) => {
        document.body.style.removeProperty(variable);
      });

      if (theme.className) {
        document.body.classList.add(theme.className);
      }

      Object.entries(theme.variables).forEach(([key, value]) => {
        document.body.style.setProperty(key, value);
      });
    },
    [themeNameToIdx],
  );

  const [selected, setSelected] = useState(0);
  useEffect(() => {
    (async () => {
      if (window.themeGlobal) {
        const globalTheme = await window.themeGlobal.get();
        if (globalTheme) {
          setSelected(themeNameToIdx(globalTheme));
          applyTheme(globalTheme);
        }
      }
    })();
  }, [applyTheme, themeNameToIdx]);

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

  if (variant === "cards") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme, idx) => {
          const themeVars = theme.variables ?? {};
          const primary = themeVars["--color-primary"] ?? "var(--primary)";
          const accent = themeVars["--color-accent"] ?? primary;
          const secondary = themeVars["--color-secondary"] ?? accent;
          const foreground = themeVars["--color-fg"] ?? "var(--foreground)";
          const background = themeVars["--color-bg"] ?? "var(--background)";
          const border = themeVars["--color-border"] ?? "var(--border)";

          const palette = [primary, accent, secondary, border];
          const isSelected = selected === idx;

          return (
            <button
              key={theme.name}
              type="button"
              onClick={() => handleChange(idx)}
              className={cn(
                "group flex flex-col gap-4 rounded-2xl border p-4 text-left transition",
                isSelected
                  ? "border-primary shadow-primary/20 shadow-lg"
                  : "border-border/60 hover:border-primary/40 hover:shadow-primary/10 hover:shadow-md",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{theme.name}</span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full transition",
                    isSelected
                      ? "bg-primary ring-primary/30 ring-2"
                      : "bg-border/70 group-hover:bg-primary/60",
                  )}
                  aria-hidden
                />
              </div>

              <div
                className="flex h-24 flex-col justify-between rounded-xl border px-4 py-3"
                style={{
                  background,
                  borderColor: border,
                  color: foreground,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-10 w-10 rounded-xl"
                    style={{ background: primary }}
                  />
                  <div className="flex flex-1 flex-col gap-2">
                    <span
                      className="h-2 rounded-full"
                      style={{ background: accent }}
                    />
                    <span
                      className="h-2 w-20 rounded-full opacity-80"
                      style={{ background: secondary }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {palette.map((color, index) => (
                    <span
                      key={`${theme.name}-${index}`}
                      className="h-3 w-3 rounded-full border border-white/30"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex min-w-32 flex-col gap-1">
      {themes.map((theme, idx) => (
        <button
          key={theme.name}
          type="button"
          className={cn(
            "rounded border px-2 py-1 text-left text-xs transition-colors",
            selected === idx
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-accent",
          )}
          onClick={() => handleChange(idx)}
        >
          {theme.name}
        </button>
      ))}
    </div>
  );
}

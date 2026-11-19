import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type Density, type ThemeMode } from "./contexts";

const THEME_KEY = "nexus.theme";
const DENSITY_KEY = "nexus.density";

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  const value = localStorage.getItem(key);
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readStored(THEME_KEY, ["light", "dark"] as const, "light"));
  const [density, setDensityState] = useState<Density>(() =>
    readStored(DENSITY_KEY, ["comfortable", "compact"] as const, "comfortable"),
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.density = density;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#1b1612" : "#f8f3ea");
  }, [theme, density]);

  const setTheme = useCallback((t: ThemeMode) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
  }, []);

  const setDensity = useCallback((d: Density) => {
    localStorage.setItem(DENSITY_KEY, d);
    setDensityState(d);
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, density, toggleTheme, setTheme, setDensity }),
    [theme, density, toggleTheme, setTheme, setDensity],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

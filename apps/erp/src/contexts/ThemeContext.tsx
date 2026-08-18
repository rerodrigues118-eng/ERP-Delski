/**
 * ThemeContext.tsx
 * ThemeProvider e useTheme customizados — sem dependências externas.
 *
 * Suporta: "light" | "dark" | "system"
 * Persiste em localStorage com a chave "delski-theme".
 * Aplica a classe "dark" no <html> via document.documentElement.classList.
 *
 * Compatível com React 19 + TanStack Router.
 */
import { createContext, useContext, useEffect, useState, useMemo } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

const STORAGE_KEY = "delski-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system";
  });

  const resolvedTheme = useMemo<"light" | "dark">(
    () => (theme === "system" ? getSystemTheme() : theme),
    [theme]
  );

  // Aplica classe dark no mount e quando o tema muda
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Escuta mudanças de preferência do SO em tempo real
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

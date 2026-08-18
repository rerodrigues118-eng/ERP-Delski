/**
 * ThemeToggle.tsx
 * Botão de alternância de tema (Claro / Escuro / Sistema)
 * com animação suave via Framer Motion.
 * Estilo: Vercel/Linear — compacto, elegante, sem excesso.
 */
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

type ThemeValue = (typeof THEMES)[number]["value"];

function ThemeIcon({ theme }: { theme: string | undefined }) {
  const iconKey = (theme ?? "system") as ThemeValue;

  const map: Record<ThemeValue, React.ComponentType<{ className?: string }>> = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const Icon = map[iconKey] ?? Monitor;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={iconKey}
        initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.6, rotate: 30 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        className="flex items-center justify-center"
      >
        <Icon className="h-[15px] w-[15px]" />
      </motion.span>
    </AnimatePresence>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Alternar tema"
          className={[
            "flex items-center justify-center h-7 w-7 rounded-lg",
            "text-muted-foreground",
            "hover:bg-accent hover:text-accent-foreground",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          ].join(" ")}
        >
          <ThemeIcon theme={theme} />
          <span className="sr-only">Alternar tema</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={6}
        className="w-36 mb-1"
      >
        {THEMES.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            className={`flex items-center gap-2 text-xs cursor-pointer ${
              theme === value
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            {label}
            {theme === value && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

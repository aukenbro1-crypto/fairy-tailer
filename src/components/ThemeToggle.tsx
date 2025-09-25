import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-button"
      aria-label="Переключить тему"
    >
      {theme === "dark" ? (
        <Sun className="theme-toggle-icon" size={20} />
      ) : (
        <Moon className="theme-toggle-icon" size={20} />
      )}
    </button>
  );
}
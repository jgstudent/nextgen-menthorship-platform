export function ThemeScript() {
  const source = `
    try {
      var theme = localStorage.getItem("nextgen_theme") || "system";
      var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    } catch (_) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: source }} />;
}

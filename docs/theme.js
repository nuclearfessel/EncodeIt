(function () {
  var KEY = "encodeit-theme";
  var root = document.documentElement;
  var button = document.getElementById("theme-toggle");

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function appliedTheme() {
    return root.getAttribute("data-theme") || systemTheme();
  }

  function syncButton() {
    if (!button) return;
    var theme = appliedTheme();
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    button.textContent = theme === "dark" ? "Light" : "Dark";
    button.title =
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  }

  function setTheme(theme) {
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
      try {
        localStorage.setItem(KEY, theme);
      } catch (e) {}
    } else {
      root.removeAttribute("data-theme");
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
    }
    syncButton();
  }

  try {
    var saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") {
      root.setAttribute("data-theme", saved);
    }
  } catch (e) {}

  syncButton();

  if (button) {
    button.addEventListener("click", function () {
      setTheme(appliedTheme() === "dark" ? "light" : "dark");
    });
  }

  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function onSystemChange() {
    if (!root.getAttribute("data-theme")) syncButton();
  }
  if (mq.addEventListener) mq.addEventListener("change", onSystemChange);
  else if (mq.addListener) mq.addListener(onSystemChange);
})();

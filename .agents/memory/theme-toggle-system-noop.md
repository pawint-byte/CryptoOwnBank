---
name: Theme toggle "system" first-click no-op
description: Why a dark-mode toggle can appear dead on the first click, and the robust fix.
---

A theme toggle that computes the next theme from the STORED theme value (e.g. `theme === "light" ? "dark" : "light"`) has a hidden bug: when the stored value is `"system"` and the OS prefers dark, the first click sets `"dark"` — which is what's already showing — so nothing visibly changes. Users report "the toggle doesn't work."

**Fix:** flip based on the ACTUAL rendered theme, not the stored string:
`const isDark = document.documentElement.classList.contains("dark"); setTheme(isDark ? "light" : "dark");`

**Why:** the resolved appearance ("system" → dark/light) is the source of truth for what the user sees; comparing against the unresolved stored value desyncs the toggle from reality on the first interaction.

**How to apply:** any tri-state (light/dark/system) theme switch. The provider + `.dark` CSS vars can be perfectly correct and the toggle still feels broken — look at the toggle's comparison logic first.

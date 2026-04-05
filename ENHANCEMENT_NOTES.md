Iron Syndicate v17 hotfix

Fixed blank-page crash on app load.

Root cause:
- `currentDaypart` and the derived welcome-tagline values were referenced in memoized dashboard logic before those values were initialized inside `App`.
- This caused a runtime `ReferenceError` during the first render, which blanked the app.

Fix applied:
- Moved the daypart / welcome-tagline initialization earlier in `App` so all downstream memoized logic can read it safely.
- Re-validated by bundling the app and rendering it in a browser-like JSDOM harness.

Validation result:
- App now renders instead of crashing on initial load.

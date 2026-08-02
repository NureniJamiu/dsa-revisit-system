// Minimal MV3 service worker. Its only job is making the toolbar icon open
// the side panel directly, instead of a popup -- side panel is the
// extension's one surface (see chrome-extension-auth-planning.md's decision
// to make it the main surface rather than a popup).
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("[ReStack] failed to set side panel behavior", err));

// Intentionally empty. The renderer talks to Noma App over a plain
// WebSocket (a standard web API, unaffected by contextIsolation) rather
// than Electron IPC, so there's no main<->renderer bridge to expose here.
// Kept as a real file (not omitted) so contextIsolation/sandbox stay on
// without Electron complaining about a missing preload path.

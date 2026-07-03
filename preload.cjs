/* eslint-disable @typescript-eslint/no-require-imports */
// Preload script — Vela currently does not need any privileged Node APIs,
// so we just expose a minimal version stamp for diagnostics.
const { contextBridge } = require("electron")

contextBridge.exposeInMainWorld("vela", {
  version: "1.0.0",
  platform: process.platform,
})

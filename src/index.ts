import { createApp } from "./kitten";

if (document.currentScript)
  createApp(document.currentScript.getAttribute("k-init") ?? "#app");

export { createApp };

// Boots this dealer's browser runtime.
// A dealer site is simple on purpose: it answers its own price book and calls no peers.

import { boot } from "./runtime/index.js";

try {
  await boot("#app", { originUrl: location.origin + location.pathname.replace(/\/[^/]*$/, "").replace(/^\/$/, "") });
} catch (err) {
  const mount = document.querySelector("#app");
  if (mount) {
    mount.innerHTML = "";
    const p = document.createElement("p");
    p.setAttribute("role", "alert");
    p.style.cssText = "margin:0;padding:1rem;color:#a32d2d";
    p.textContent = `This dealer's agent runtime did not start: ${err?.message || err}.`;
    mount.appendChild(p);
  }
}

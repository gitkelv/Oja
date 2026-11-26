// Contract tests. No dependencies: run with `node tests/contracts.test.mjs`.
//
// These exist because of a real failure: site-actions.js exported its class but not
// the registerActions function the runtime requires, so the whole runtime refused to
// start in the browser while every file looked correct on disk. A unit test would not
// have caught it; a contract test does.

import { readFileSync, readdirSync } from "node:fs";
import { AgentNetwork, validateNetwork } from "../runtime/kernel.js";

let failures = 0;

/**
 * Assert one condition and record the result.
 *
 * :param name: What is being checked.
 * :param condition: Whether it held.
 * :param detail: Shown when it did not.
 */
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  pass  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

console.log("\nAction module contract");
const actions = await import("../site-actions.js");
check("site-actions.js exports registerActions as a function", typeof actions.registerActions === "function");

const registered = [];
actions.registerActions({ register: (d) => registered.push(d) });
const names = registered.map((r) => r.name);
const manifest = JSON.parse(readFileSync(new URL("../agent-manifest.json", import.meta.url)));
for (const declared of manifest.actions.agentTools) {
  check(`manifest declares ${declared}, and the module registers it`, names.includes(declared));
}
for (const r of registered) {
  check(`${r.name} has a description, effect, schema and executor`,
    Boolean(r.description && r.effect && r.inputSchema && typeof r.execute === "function"));
}

console.log("\nArithmetic is computed, not generated");
const total = registered.find((r) => r.name === "compute_order_total");
const t = total.execute({ unit_price_naira: 10800, quantity: 600, delivery_naira: 85000 });
check("600 bags at 10,800 plus 85,000 delivery is 6,565,000", t.total_naira === 6565000, JSON.stringify(t));
check("a negative quantity is refused rather than computed", total.execute({ unit_price_naira: 10800, quantity: -5 }).ok === false);
check("a zero price is refused rather than computed", total.execute({ unit_price_naira: 0, quantity: 10 }).ok === false);

console.log("\nEvery published network validates");
const nets = [
  "../oja.network.json",
  ...readdirSync(new URL("../dealers", import.meta.url)).map((d) => {
    const dir = new URL(`../dealers/${d}/`, import.meta.url);
    const f = readdirSync(dir).find((n) => n.endsWith(".network.json"));
    return `../dealers/${d}/${f}`;
  }),
];
for (const p of nets) {
  const cfg = JSON.parse(readFileSync(new URL(p, import.meta.url)));
  const { errors } = validateNetwork(new AgentNetwork(cfg, "t"));
  check(`${p.split("/").pop()} validates clean`, errors.length === 0, errors.join("; "));
}

console.log("\nBuyer network shape");
const oja = JSON.parse(readFileSync(new URL("../oja.network.json", import.meta.url)));
check("publishes at least two agents, as the profile's checks require", (oja.tools || []).length >= 2,
  `found ${(oja.tools || []).length}`);
const links = JSON.parse(readFileSync(new URL("../links.json", import.meta.url)));
const slots = Object.keys(oja.link_slots || {});
const mapped = Object.keys(links.networks?.oja || {});
check("every peer link slot is resolved in links.json", slots.every((s) => mapped.includes(s)),
  `slots ${slots.join(",")} vs links ${mapped.join(",")}`);
const origins = Object.values(links.networks.oja).map((u) => new URL(u).origin);
check("each dealer is a distinct origin", new Set(origins).size === origins.length, origins.join(" "));
check("every dealer origin is in allowed_peers",
  origins.every((o) => (manifest.allowed_peers || []).map((p) => p.replace(/\/$/, "")).includes(o)));

console.log(failures === 0 ? "\nAll contracts hold.\n" : `\n${failures} contract(s) broken.\n`);
process.exit(failures === 0 ? 0 : 1);

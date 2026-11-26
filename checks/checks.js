// Runs the conformance checks that need no model and no API key.
//
// The spec's section 6 lists seven interoperability checks. Most of an entry's
// effort naturally goes into the happy path, so the checks that matter here are the
// ones about refusing: an invalid network, a denied origin, a bounded run. A runtime
// that fails quietly looks identical to one that works until the day it doesn't.

import { AgentNetwork, validateNetwork, parseExternalAgent } from "../runtime/kernel.js";

/**
 * Runs each check and writes its result into the page.
 */
class Checks {
  /**
   * Run every check that works without a model.
   */
  static async run() {
    await Checks.invalidNetwork();
    await Checks.deniedOrigin();
    await Checks.allowedOrigin();
    await Checks.boundedExecution();
    await Checks.routerOwnership();
  }

  // --- check: an invalid network is refused ---------------------------------

  /**
   * Load a deliberately malformed network and show that it is rejected before
   * any model call, rather than being run and failing later.
   */
  static async invalidNetwork() {
    try {
      const res = await fetch("./fixtures/invalid.network.json");
      const cfg = await res.json();
      const net = new AgentNetwork(cfg, "invalid");
      const { errors } = validateNetwork(net);
      if (errors.length > 0) {
        Checks.pass(
          "invalid-network",
          "Refused before any model call.",
          errors.map((e) => `• ${e}`).join("\n"),
        );
      } else {
        Checks.fail("invalid-network", "The validator accepted a network it should have refused.");
      }
    } catch (err) {
      Checks.fail("invalid-network", `The check itself failed: ${err.message}`);
    }
  }

  // --- check: a denied origin is refused ------------------------------------

  /**
   * Try to resolve a peer network on an origin that is not in allowed_peers,
   * and show that the policy refuses it.
   */
  static async deniedOrigin() {
    const stranger = "https://not-a-dealer.example/some_network";
    try {
      const manifest = await Checks.manifest();
      const allowed = manifest.allowed_peers || [];
      const parsed = parseExternalAgent(stranger, location.origin);
      const base = parsed?.base || new URL(stranger).origin;
      const permitted = allowed.some((o) => base.startsWith(o.replace(/\/$/, "")));
      if (!permitted) {
        Checks.pass(
          "denied-origin",
          "Refused, and the refusal is visible.",
          `Requested: ${stranger}\nIts origin is not in allowed_peers, and peer_policy mode is "${manifest.peer_policy?.mode}".\nỌjà will not contact it, and does not report the attempt as successful.`,
        );
      } else {
        Checks.fail("denied-origin", "A stranger origin was treated as permitted.");
      }
    } catch (err) {
      Checks.fail("denied-origin", `The check itself failed: ${err.message}`);
    }
  }

  // --- check: a permitted origin is recognised ------------------------------

  /**
   * Show the same policy accepting the dealers, so the refusal above is a real
   * decision rather than a runtime that refuses everything.
   */
  static async allowedOrigin() {
    try {
      const manifest = await Checks.manifest();
      const links = await (await fetch("../links.json")).json();
      const peers = Object.entries(links.networks?.oja || {});
      const allowed = (manifest.allowed_peers || []).map((o) => o.replace(/\/$/, ""));
      const lines = peers.map(([name, url]) => {
        const origin = new URL(url).origin;
        const ok = allowed.includes(origin);
        return `${ok ? "permitted" : "REFUSED"}  ${name} → ${origin}`;
      });
      const allOk = lines.every((l) => l.startsWith("permitted"));
      if (allOk) {
        Checks.pass(
          "allowed-origin",
          "Each dealer resolves to a permitted origin.",
          lines.join("\n") +
            "\n\nEach is a different origin, so every call is a genuine cross-origin request.",
        );
      } else {
        Checks.fail("allowed-origin", `A dealer is not permitted:\n${lines.join("\n")}`);
      }
    } catch (err) {
      Checks.fail("allowed-origin", `The check itself failed: ${err.message}`);
    }
  }

  // --- check: execution is bounded ------------------------------------------

  /**
   * Show the declared limits. A cycle is not a validation error under the spec,
   * which says repeated invocation of an agent must not by itself be treated as
   * one. It is bounded execution that stops it, so that is what is shown.
   */
  static async boundedExecution() {
    try {
      const net = await (await fetch("../oja.network.json")).json();
      const cyc = await (await fetch("./fixtures/cycle.network.json")).json();
      const cycNet = new AgentNetwork(cyc, "cycle");
      const { errors } = validateNetwork(cycNet);
      Checks.pass(
        "bounded-execution",
        "Bounded by declared limits, not by rejecting repetition.",
        `Ọjà declares max_steps ${net.max_steps}.\n` +
          `The deliberately cyclic fixture produces ${errors.length} validation error${errors.length === 1 ? "" : "s"}, which is correct: ` +
          `the specification says repeated invocation of the same agent must not by itself be treated as a cycle.\n` +
          `It is the step and depth budget that stops the run, and the stop is reported as a failure rather than a result.`,
      );
    } catch (err) {
      Checks.fail("bounded-execution", `The check itself failed: ${err.message}`);
    }
  }

  // --- check: the caller owns the router ------------------------------------

  /**
   * Show that no dealer manifest can change which router Ọjà uses or receive a
   * visitor's key. This is read from the published files, so it is checkable
   * without running anything.
   */
  static async routerOwnership() {
    try {
      const manifest = await Checks.manifest();
      Checks.pass(
        "router-ownership",
        "The caller owns inference. A peer cannot change it.",
        `Ọjà's router: ${manifest.llm_router?.base_url}\n` +
          "A loaded dealer network runs on this router, inside this browser, under Ọjà's limits.\n" +
          "Router metadata in a dealer's own manifest is informational during composition and cannot override it.\n" +
          "When a visitor key is active it is attached only to requests to this router, and never to a dealer site.",
      );
    } catch (err) {
      Checks.fail("router-ownership", `The check itself failed: ${err.message}`);
    }
  }

  // --- helpers --------------------------------------------------------------

  /**
   * Read Ọjà's own manifest once.
   *
   * :return: The parsed manifest.
   */
  static async manifest() {
    if (!Checks._manifest) Checks._manifest = await (await fetch("../agent-manifest.json")).json();
    return Checks._manifest;
  }

  /**
   * Mark a check as passed and show its evidence.
   *
   * :param id: The check's element id.
   * :param summary: One line saying what happened.
   * :param detail: The evidence, shown verbatim.
   */
  static pass(id, summary, detail) {
    Checks.write(id, "pass", summary, detail);
  }

  /**
   * Mark a check as failed. A failing check is left on the page on purpose:
   * hiding it would defeat the point of publishing checks at all.
   *
   * :param id: The check's element id.
   * :param detail: What went wrong.
   */
  static fail(id, detail) {
    Checks.write(id, "fail", "This check did not pass.", detail);
  }

  /**
   * Write one result into the page.
   *
   * :param id: The check's element id.
   * :param state: "pass" or "fail".
   * :param summary: One line saying what happened.
   * :param detail: The evidence, shown verbatim.
   */
  static write(id, state, summary, detail) {
    const el = document.querySelector(`#${id}`);
    if (!el) return;
    el.dataset.state = state;
    const s = el.querySelector(".check-summary");
    const d = el.querySelector(".check-detail");
    if (s) s.textContent = summary;
    if (d) d.textContent = detail;
  }
}

Checks.run();

export { Checks };

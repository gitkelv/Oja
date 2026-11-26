// Boots the Ọjà browser runtime and wires the page to it.
//
// The ask form is the front door, not the chat box. A buyer types once, the board
// fills as dealers answer, and the chat panel below is there only for follow-ups.

import { boot } from "./runtime/index.js";
import { Board } from "./board.js";

/**
 * Starts the runtime, registers Ọjà's own actions and connects the ask form.
 */
class Site {
  /**
   * The engine, once booted. Null until then.
   */
  static engine = null;

  /**
   * Boot the runtime and wire the page.
   *
   * :return: Nothing. Failures are reported on the page, not thrown away.
   */
  static async start() {
    try {
      const { engine } = await boot("#app", { originUrl: location.origin + Site.basePath() });
      Site.engine = engine;
    } catch (err) {
      Site.showBootFailure(err);
      return;
    }
    Site.wireForm();
    Site.wireExamples();
  }

  /**
   * The folder this site is served from.
   *
   * GitHub Pages serves a project site under /<repo>/, so the manifest and network
   * are not at the origin root. Deriving the base from the page's own URL means the
   * same files work at a root domain and in a subfolder without being edited.
   *
   * :return: The base path, without a trailing slash.
   */
  static basePath() {
    const path = location.pathname.replace(/\/[^/]*$/, "");
    return path === "/" ? "" : path;
  }

  /**
   * Connect the ask form so a question clears the board and goes to the agents.
   */
  static wireForm() {
    const form = document.querySelector("#ask-form");
    const input = document.querySelector("#ask-input");
    if (!form || !input) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      Site.ask(input.value);
    });
  }

  /**
   * Make the example chips fill the box and ask straight away.
   */
  static wireExamples() {
    for (const chip of document.querySelectorAll(".example")) {
      chip.addEventListener("click", () => {
        const input = document.querySelector("#ask-input");
        if (input) input.value = chip.textContent.trim();
        Site.ask(chip.textContent.trim());
      });
    }
  }

  /**
   * Send one question to the agent network and let the actions fill the board.
   *
   * :param text: What the buyer typed.
   */
  static async ask(text) {
    const question = String(text || "").trim();
    const button = document.querySelector("#ask-form button");
    const input = document.querySelector("#ask-input");
    if (!question) {
      Site.showAskError("Type what you need first — material, quantity and where it's going.");
      return;
    }
    if (!Site.engine) {
      Site.showAskError("The agent runtime has not started, so no dealer can be asked yet.");
      return;
    }
    Site.clearAskError();
    Board.reset();
    Board.setRequest(question);
    if (button) {
      button.disabled = true;
      button.textContent = "Asking…";
    }
    try {
      await Site.engine.run(question);
    } catch (err) {
      Site.showAskError(`The dealers could not be asked: ${err?.message || err}`);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Ask the dealers";
      }
      if (input) input.focus();
    }
  }

  /**
   * Show a problem with the question, next to the box that caused it.
   *
   * :param message: What went wrong, in the buyer's terms.
   */
  static showAskError(message) {
    let el = document.querySelector("#ask-error");
    if (!el) {
      el = document.createElement("p");
      el.id = "ask-error";
      el.setAttribute("role", "alert");
      el.style.cssText = "margin:.6rem 0 0;color:#a32d2d;font-size:.92rem";
      document.querySelector("#ask-form")?.after(el);
    }
    el.textContent = message;
  }

  /**
   * Clear any previous error once the buyer tries again.
   */
  static clearAskError() {
    document.querySelector("#ask-error")?.remove();
  }

  /**
   * Say plainly that the runtime did not start, rather than leaving a dead page.
   *
   * :param err: Whatever boot threw.
   */
  static showBootFailure(err) {
    const mount = document.querySelector("#app");
    if (!mount) return;
    mount.innerHTML = "";
    const p = document.createElement("p");
    p.setAttribute("role", "alert");
    p.style.cssText = "margin:0;padding:1rem;color:#a32d2d";
    p.textContent = `Ọjà could not start its agent runtime: ${err?.message || err}. No dealer has been contacted.`;
    mount.appendChild(p);
  }
}

Site.start();

export { Site };

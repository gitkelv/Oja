// The quote board: Ọjà's primary surface.
//
// Most agentic websites put a chat log in front of the user. A buyer comparing
// dealers is not having a conversation, they are reading a table, so the board is
// the front door and the chat is a side panel. Cards land here one at a time as
// each dealer's agent answers, which is also how the buyer sees the work happening.

/**
 * Holds the quotes recorded in this session and keeps the page in step with them.
 */
class BoardState {
  constructor() {
    this._quotes = [];
    this._spread = null;
    this._request = "";
    this._expected = [];
    this._consent = null;
  }

  /**
   * Ask the visitor to approve contacting one dealer.
   *
   * The profile requires approval before each third-party contact, and the
   * reference runtime asks for it inside its chat panel. On this page that panel
   * is closed by default, so the question was being asked where nobody could
   * answer it and the run waited forever. Consent belongs on the board anyway:
   * it is asked exactly where that dealer's card is about to appear.
   *
   * :param request: label, origin, requestText and a decide callback.
   */
  setConsent(request) {
    this._consent = request;
    this.render();
    const card = document.querySelector(".quote-card-consent button");
    if (card) card.focus();
  }

  /**
   * Clear the pending approval once it has been answered.
   */
  clearConsent() {
    this._consent = null;
    this.render();
  }

  /**
   * Name the dealers that are about to be asked.
   *
   * Asking three dealers one at a time takes minutes. Without this the page sits
   * empty and the buyer cannot tell whether it is working, so every dealer appears
   * at once as a waiting card and fills in when it answers.
   *
   * :param names: The dealer names, in the order they will be asked.
   */
  setExpected(names) {
    this._expected = Array.isArray(names) ? [...names] : [];
    this.render();
  }

  /**
   * Every quote recorded so far, newest last.
   *
   * :return: A copy of the quote list.
   */
  quotes() {
    return [...this._quotes];
  }

  /**
   * How many quotes are on the board.
   *
   * :return: The count.
   */
  count() {
    return this._quotes.length;
  }

  /**
   * Record what the buyer asked for, shown above the board.
   *
   * :param text: The buyer's request in their own words.
   */
  setRequest(text) {
    this._request = String(text || "");
    this.render();
  }

  /**
   * Add one dealer's answer and redraw.
   *
   * A second answer from the same dealer replaces the first, so a dealer that
   * corrects itself does not appear twice.
   *
   * :param quote: The dealer's answer.
   */
  addQuote(quote) {
    BoardState.announce(
      quote.answered
        ? `${quote.dealer} answered${Number.isFinite(quote.unit_price_naira) ? `: ₦${quote.unit_price_naira.toLocaleString("en-NG")} per ${quote.unit || "unit"}` : ", with no price"}.`
        : `${quote.dealer} did not answer.`,
    );
    const i = this._quotes.findIndex((q) => BoardState.key(q.dealer) === BoardState.key(quote.dealer));
    if (i >= 0) this._quotes[i] = { ...quote, at: Date.now() };
    else this._quotes.push({ ...quote, at: Date.now() });
    this.render();
  }

  /**
   * Record the spread worked out by compare_quotes.
   *
   * :param spread: Lowest, highest, gap and gap percentage.
   */
  setSpread(spread) {
    BoardState.announce(
      `All dealers in. ₦${spread.gap.toLocaleString("en-NG")} between the lowest and highest, ${spread.gapPercent} per cent.`,
    );
    this._spread = spread;
    this.render();
  }

  /**
   * Clear the board for a new question.
   */
  reset() {
    this._quotes = [];
    this._spread = null;
    this.render();
  }

  // --- rendering ------------------------------------------------------------

  /**
   * Say what just changed, for a screen reader.
   *
   * The board itself is not a live region: it is redrawn whole on every change,
   * so announcing it would read every card again each time a dealer answers.
   * This announces only the new fact.
   *
   * :param text: One sentence describing the change.
   */
  static announce(text) {
    const el = document.querySelector("#board-status");
    if (el) el.textContent = text;
  }

  /**
   * Redraw the board from current state.
   */
  render() {
    const root = document.querySelector("#board");
    if (!root) return;
    const empty = document.querySelector("#board-empty");
    if (empty) empty.hidden = this._quotes.length > 0;
    root.innerHTML = "";
    if (this._request) {
      const h = document.createElement("p");
      h.className = "board-request";
      h.textContent = this._request;
      root.appendChild(h);
    }
    const grid = document.createElement("div");
    grid.className = "quote-grid";
    for (const q of this._quotes) grid.appendChild(BoardState.card(q));
    const heard = new Set(this._quotes.map((q) => BoardState.key(q.dealer)));
    const asking = this._consent ? BoardState.key(this._consent.label) : null;
    for (const name of this._expected) {
      const k = BoardState.key(name);
      if (heard.has(k)) continue;
      grid.appendChild(k === asking ? BoardState.consentCard(this._consent) : BoardState.waitingCard(name));
    }
    if (this._consent && !this._expected.some((n) => BoardState.key(n) === asking)) {
      grid.appendChild(BoardState.consentCard(this._consent));
    }
    root.appendChild(grid);
    if (this._spread) root.appendChild(BoardState.spreadPanel(this._spread));
  }

  /**
   * The business name alone, for a heading.
   *
   * A dealer may answer as "Ilara Depot, Ilara Junction, Lagos State". The address
   * belongs on the dealer's own page, not wrapped across three lines of a card.
   *
   * :param name: The dealer name as given.
   * :return: The part before the first comma.
   */
  static businessName(name) {
    return String(name || "").split(",")[0].trim();
  }

  /**
   * Reduce a dealer name to something comparable.
   *
   * A dealer agent may answer as "Ilara Depot" or "Ilara Depot, Ilara Junction,
   * Lagos State", and a waiting card must not sit next to the answer it belongs to.
   *
   * :param name: The dealer name as given.
   * :return: A comparison key.
   */
  static key(name) {
    return String(name || "").toLowerCase().split(",")[0].replace(/[^a-z0-9]/g, "");
  }

  /**
   * Build the card that asks permission to contact one dealer.
   *
   * :param request: label, origin, requestText and decide.
   * :return: The card element.
   */
  static consentCard(request) {
    const el = document.createElement("article");
    el.className = "quote-card quote-card-consent";

    const h = document.createElement("h3");
    h.textContent = request.label;
    el.appendChild(h);

    const ask = document.createElement("p");
    ask.className = "consent-ask";
    ask.textContent = "Contact this dealer for a quote?";
    el.appendChild(ask);

    const origin = document.createElement("p");
    origin.className = "consent-origin";
    origin.textContent = request.origin;
    el.appendChild(origin);

    const actions = document.createElement("div");
    actions.className = "consent-actions";
    for (const [label, decision] of [["Allow", "allow"], ["Always", "always"], ["Decline", "decline"]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (decision === "decline") b.className = "ghost";
      b.addEventListener("click", () => request.decide(decision), { once: true });
      actions.appendChild(b);
    }
    el.appendChild(actions);
    return el;
  }

  /**
   * Build a card for a dealer that has not answered yet.
   *
   * :param name: The dealer's name.
   * :return: The card element.
   */
  static waitingCard(name) {
    const el = document.createElement("article");
    el.className = "quote-card quote-card-waiting";
    const h = document.createElement("h3");
    h.textContent = name;
    const p = document.createElement("p");
    p.className = "quote-waiting";
    p.textContent = "Waiting for this dealer…";
    el.append(h, p);
    return el;
  }

  /**
   * Build one dealer card.
   *
   * :param q: The dealer's answer.
   * :return: The card element.
   */
  static card(q) {
    // A price is proof the dealer answered, whatever the flag says. A real quote
    // shown as a failure is worse than a wrong colour: it tells the buyer a usable
    // price does not exist, and it drops that dealer out of the comparison.
    const priced = Number.isFinite(q.unit_price_naira) && q.unit_price_naira > 0;
    const answered = q.answered || priced;
    const el = document.createElement("article");
    el.className = answered ? "quote-card" : "quote-card quote-card-failed";

    const name = document.createElement("h3");
    name.textContent = BoardState.businessName(q.dealer);
    el.appendChild(name);

    if (!answered) {
      const why = document.createElement("p");
      why.className = "quote-failed-reason";
      why.textContent = q.note || "This dealer did not answer.";
      el.appendChild(why);
      return el;
    }

    const price = document.createElement("p");
    price.className = "quote-price";
    price.textContent = Number.isFinite(q.unit_price_naira)
      ? `₦${q.unit_price_naira.toLocaleString("en-NG")}`
      : "No price given";
    el.appendChild(price);

    if (q.unit) {
      const unit = document.createElement("p");
      unit.className = "quote-unit";
      unit.textContent = `per ${q.unit}`;
      el.appendChild(unit);
    }

    const rows = [
      ["Material", q.material],
      ["Minimum order", q.minimum_order],
      ["Delivery", q.delivery],
    ];
    const dl = document.createElement("dl");
    for (const [label, value] of rows) {
      if (!value) continue;
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      dl.append(dt, dd);
    }
    if (dl.children.length) el.appendChild(dl);

    if (q.price_date) {
      const date = document.createElement("p");
      const stale = BoardState.isStale(q.price_date);
      date.className = stale ? "quote-date quote-date-stale" : "quote-date";
      date.textContent = stale ? `Priced ${q.price_date} — check before buying` : `Priced ${q.price_date}`;
      el.appendChild(date);
    }

    if (q.note) {
      const note = document.createElement("p");
      note.className = "quote-note";
      note.textContent = q.note;
      el.appendChild(note);
    }

    // Rendered here rather than asked of the dealer. Three agents generating the
    // same sentence costs time the buyer waits through, and a disclosure the page
    // controls cannot be softened or dropped by a dealer having an off turn.
    const status = document.createElement("p");
    status.className = "quote-status";
    status.textContent = "Representative demonstration dealer — not live inventory, nothing can be bought.";
    el.appendChild(status);
    return el;
  }

  /**
   * Decide whether a quoted date is more than seven days old.
   *
   * Ọjà marks rather than hides stale prices: a buyer should see the age and
   * judge for themselves, because the alternative is a confident wrong number.
   *
   * :param text: The date the dealer gave, in any readable form.
   * :return: True when the date parses and is over seven days old.
   */
  static isStale(text) {
    const t = Date.parse(text);
    if (Number.isNaN(t)) return false;
    return Date.now() - t > 7 * 24 * 60 * 60 * 1000;
  }

  /**
   * Build the spread panel. It shows the range and the gap, never a midpoint.
   *
   * :param spread: Lowest, highest, gap and gap percentage.
   * :return: The panel element.
   */
  static spreadPanel({ low, high, gap, gapPercent }) {
    const el = document.createElement("section");
    el.className = gapPercent > 10 ? "spread spread-wide" : "spread";

    const h = document.createElement("h3");
    h.textContent = "The gap between them";
    el.appendChild(h);

    const line = document.createElement("p");
    line.className = "spread-line";
    line.textContent =
      `${low.dealer} ₦${low.unit_price_naira.toLocaleString("en-NG")}` +
      `  ·  ${high.dealer} ₦${high.unit_price_naira.toLocaleString("en-NG")}`;
    el.appendChild(line);

    const gapLine = document.createElement("p");
    gapLine.className = "spread-gap";
    gapLine.textContent = `₦${gap.toLocaleString("en-NG")} apart, ${gapPercent}%`;
    el.appendChild(gapLine);

    if (gapPercent > 10) {
      const warn = document.createElement("p");
      warn.className = "spread-warning";
      // Not a statement of policy. A buyer does not care what Ọjà refuses to do;
      // he cares what to check before spending the money. A gap this wide almost
      // always means the quotes are not comparable rather than one being a bargain.
      warn.textContent =
        "A gap this wide usually means the quotes are not the same deal. Check each dealer's minimum order and whether they deliver to you before choosing on price alone.";
      el.appendChild(warn);
    }
    return el;
  }
}

const Board = new BoardState();
export { Board };
export default Board;

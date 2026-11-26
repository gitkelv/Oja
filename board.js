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
    const i = this._quotes.findIndex((q) => q.dealer === quote.dealer);
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
    root.appendChild(grid);
    if (this._spread) root.appendChild(BoardState.spreadPanel(this._spread));
  }

  /**
   * Build one dealer card.
   *
   * :param q: The dealer's answer.
   * :return: The card element.
   */
  static card(q) {
    const el = document.createElement("article");
    el.className = q.answered ? "quote-card" : "quote-card quote-card-failed";

    const name = document.createElement("h3");
    name.textContent = q.dealer;
    el.appendChild(name);

    if (!q.answered) {
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
    h.textContent = "The spread";
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
      warn.textContent =
        "These dealers disagree by more than ten per cent. That disagreement is the finding. Ọjà will not average them into one number.";
      el.appendChild(warn);
    }
    return el;
  }
}

const Board = new BoardState();
export { Board };
export default Board;

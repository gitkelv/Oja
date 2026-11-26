# DESIGN SYSTEM — Ọjà

Decided 26 Nov 2026. These are the chosen values, not conventions to choose from.

---

## 1. WHAT IT IS DESIGNED AGAINST

A money-decision tool for a Nigerian builder on a phone, not a dashboard. The references are **Wise** (plain-language money, big legible figures, works across markets) and **Stripe** (dense financial information made calm). Explicitly not developer-tool conventions: no dark chrome, no information density for its own sake, no navigation a visitor does not need.

The product's argument is honest local trade against opaque aggregators. The design has to agree with that, which rules out looking institutional or looking like a marketplace.

---

## 2. COLOUR

Market green with amber. Green carries money and trust and reads Nigerian without waving a flag at anyone.

| Token | Value | Job |
|---|---|---|
| `--green` | `#0B5D45` | Primary: buttons, mark, links |
| `--green-deep` | `#074436` | Hover, headings on light, footer labels |
| `--green-wash` | `#E6F0EC` | Narrow-gap spread panel |
| `--green-line` | `#9CC4B6` | Borders on green surfaces |
| `--amber` | `#D98C2B` | Accent in the mark |
| `--amber-deep` | `#8A5410` | Warning text |
| `--amber-wash` | `#FBF1E2` | Stale price, wide gap |
| `--amber-line` | `#E8BE84` | Borders on amber surfaces |
| `--paper` | `#F7F5EF` | Page |
| `--card` | `#FFFFFF` | Cards, masthead, footer |
| `--line` / `--line-strong` | `#E2E0D8` / `#C7C4B8` | Hairline / emphasis |
| `--ink` / `--ink-soft` / `--ink-faint` | `#1A1A17` / `#52554E` / `#7A7D74` | Body / supporting / metadata |
| `--red`, `--red-wash`, `--red-line`, `--red-ink` | `#A32D2D`, `#FBEAEA`, `#E8A5A5`, `#7A1F1F` | A dealer that did not answer |

**Amber has two jobs and no others: a stale price, and a gap too wide to trust.** Using it decoratively would make a warning stop reading as a warning. Paper is warm rather than white because this is a building-materials product, not a dashboard.

---

## 3. TYPE

| Role | Family | Notes |
|---|---|---|
| Headlines, wordmark | **Fraunces** 500 | One weight only. Warm and crafted rather than cold fintech |
| Everything else | **Inter** 400/500/600 | Chosen for its numerals |
| Prices | Inter with `font-variant-numeric: tabular-nums` and `"tnum" 1` | Digits must align down a column |

Loaded from Google Fonts with `preconnect` and `display=swap`. **The payload is a design constraint, not an afterthought:** this is for builders on mobile data, and a product arguing that it serves people others ignore cannot cost 300KB to open. Fraunces is restricted to headline use for that reason.

Rejected: Instrument Serif (more elegant, read fashion rather than trade, single weight); Plus Jakarta Sans alone (lightest, least distinctive).

---

## 4. MARK

Three bars of unequal height, the third in amber. It is what the board does — three quotes side by side, one standing apart — and it holds up at 16px.

Files: `brand/mark.svg`, `brand/logo.svg` (lockup), `favicon.svg` (copied to every site).

**A market-stall mark was rejected on strategy, not aesthetics.** A stall says marketplace, and the entire argument is that dealers keep their own prices on their own sites rather than joining one. The logo must not contradict the product.

---

## 5. LAYOUT AND COMPONENTS

- Container `min(1040px, 100% - 2.5rem)`; measure capped at 60ch.
- Radius 12px cards, 12px controls. Hairline borders, no shadows.
- **Touch targets minimum 44px.** This is used on a phone; the example chips failed this before it was caught.
- Quote grid `repeat(auto-fit, minmax(16rem, 1fr))`.
- Masthead carries the mark and the name and nothing else.
- The agent panel sits closed behind a summary and opens itself when a question fails for want of a connected model.
- Disclosure lives in the footer: findable, not shouted at someone comparing prices.

---

## 6. COPY RULES

Learned from a real mistake. The spread panel once said *"Ọjà will not average them into one number"* — the product talking about itself. A contractor about to spend millions does not care what Ọjà refuses to do; he cares what to check before he spends it.

- **Never state policy where guidance belongs.** Say what to check, not what we decline to do.
- Lead with the buyer's problem in his terms, not our mechanism.
- Reasoning belongs in the footer disclosure, for the reader who goes looking.
- Plain words over trade jargon: "the gap between them", not "the spread".
- A page-owned disclosure beats an agent-generated one — it cannot be softened by a model having an off turn, and it is faster.

---

## 7. ACCESSIBILITY

- Live region announces only what changed. `aria-live` on the board itself re-read every card each time one dealer answered.
- Visible focus rings on every control, 2px offset.
- `prefers-reduced-motion` honoured.
- Labels on all inputs; no images, so no alt-text surface.
- Contrast: ink on paper and on card, and every `*-ink` on its matching `*-wash`, all meet AA.

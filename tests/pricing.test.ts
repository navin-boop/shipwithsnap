import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POSTAGE_MARKUP_PERCENT, marginCents, sellPriceCents } from "../src/lib/ship/pricing";

describe("postage markup", () => {
  it("adds the markup to the carrier rate", () => {
    assert.equal(sellPriceCents(568), 654); // $5.68 -> $6.54
    assert.equal(sellPriceCents(741), 853); // $7.41 -> $8.53
    assert.equal(sellPriceCents(1000), 1150);
  });

  it("keeps the margin", () => {
    assert.equal(marginCents(1000), 150);
    assert.ok(marginCents(568) > 0);
  });

  it("charges nothing for a zero or missing rate", () => {
    assert.equal(sellPriceCents(0), 0);
    assert.equal(sellPriceCents(-1), 0);
    assert.equal(sellPriceCents(Number.NaN), 0);
  });

  it("returns whole cents only — money is integers everywhere", () => {
    for (let c = 1; c <= 500_00; c += 137) assert.ok(Number.isInteger(sellPriceCents(c)), `fractional at ${c}`);
  });

  it("never prices below the carrier's own rate", () => {
    for (let c = 1; c <= 500_00; c += 97) assert.ok(sellPriceCents(c) >= c, `at ${c} we would sell below cost`);
  });

  it("rises with the carrier rate, never falls", () => {
    let previous = 0;
    for (let c = 0; c <= 500_00; c += 250) {
      const p = sellPriceCents(c);
      assert.ok(p >= previous, `price fell from ${previous} to ${p} at ${c}`);
      previous = p;
    }
  });

  it("is the documented percentage", () => {
    assert.equal(POSTAGE_MARKUP_PERCENT, 15);
    // A round number where the arithmetic is checkable by eye.
    assert.equal(sellPriceCents(10_000), 11_500);
  });
});

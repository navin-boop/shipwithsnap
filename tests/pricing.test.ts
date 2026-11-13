import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POSTAGE_MARKUP_PERCENT, marginCents, sellPriceCents, splitCents } from "../src/lib/ship/pricing";

describe("multi-box price split", () => {
  it("adds back up to exactly what was charged", () => {
    for (const total of [0, 1, 99, 1000, 1301, 4_567, 123_457]) {
      for (const n of [1, 2, 3, 7, 20]) {
        const parts = splitCents(total, n);
        assert.equal(parts.length, n);
        assert.equal(parts.reduce((a, b) => a + b, 0), total, `${total} over ${n}`);
        assert.ok(parts.every((p) => Number.isInteger(p) && p >= 0));
        assert.ok(Math.max(...parts) - Math.min(...parts) <= 1, "shares differ by at most a cent");
      }
    }
  });

  it("gives the odd cents to the first boxes", () => {
    assert.deepEqual(splitCents(1001, 3), [334, 334, 333]);
  });

  it("returns nothing for no boxes", () => {
    assert.deepEqual(splitCents(1000, 0), []);
  });

  it("splits the marked-up price, not the carrier's", () => {
    // Two boxes rated together at $20.00 by the carrier: the seller pays $26.00, $13.00 a box.
    assert.deepEqual(splitCents(sellPriceCents(2000), 2), [1300, 1300]);
  });
});

describe("postage markup", () => {
  it("adds the markup to the carrier rate", () => {
    assert.equal(sellPriceCents(568), 739); // $5.68 -> $7.39
    assert.equal(sellPriceCents(741), 964); // $7.41 -> $9.64
    assert.equal(sellPriceCents(1000), 1300);
  });

  it("keeps the margin", () => {
    assert.equal(marginCents(1000), 300);
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
    assert.equal(POSTAGE_MARKUP_PERCENT, 30);
    // A round number where the arithmetic is checkable by eye.
    assert.equal(sellPriceCents(10_000), 13_000);
  });
});

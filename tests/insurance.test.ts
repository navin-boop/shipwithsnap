import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INSURANCE_CENTS_PER_100,
  INSURANCE_MAX_VALUE_CENTS,
  INSURANCE_MINIMUM_CENTS,
  insurancePremiumCents,
  insuranceRateLabel,
  insuranceValueError,
} from "../src/lib/ship/insurance";

describe("insurance premium", () => {
  it("charges 70 cents per $100 of declared value", () => {
    assert.equal(insurancePremiumCents(50_000), 350); // $500 declared -> $3.50
    assert.equal(insurancePremiumCents(100_000), 700); // $1,000 declared -> $7.00
    assert.equal(insurancePremiumCents(500_000), 3_500); // $5,000 declared -> $35.00
  });

  it("applies the minimum below about $143, and the rate above it", () => {
    // 70c per $100 only reaches the $1.00 floor at $142.86 of declared value.
    assert.equal(insurancePremiumCents(10_000), INSURANCE_MINIMUM_CENTS); // $100 -> floor, not 70c
    assert.equal(insurancePremiumCents(20_000), 140); // $200 -> $1.40, above the floor
  });

  it("charges nothing when nothing is declared", () => {
    assert.equal(insurancePremiumCents(0), 0);
    assert.equal(insurancePremiumCents(null), 0);
    assert.equal(insurancePremiumCents(undefined), 0);
  });

  it("never sells cover below the minimum", () => {
    // 14 cents of premium costs more than that to place, so the floor applies.
    assert.equal(insurancePremiumCents(2_000), INSURANCE_MINIMUM_CENTS);
    assert.equal(insurancePremiumCents(1), INSURANCE_MINIMUM_CENTS);
  });

  it("rounds up, so no label leaks a fraction of a cent", () => {
    // $1,234.50 -> 864.15 cents, which must not become 864.
    assert.equal(insurancePremiumCents(123_450), 865);
  });

  it("returns whole cents only — money is integers everywhere", () => {
    for (let value = 0; value <= 500_000; value += 997) {
      const premium = insurancePremiumCents(value);
      assert.ok(Number.isInteger(premium), `premium for ${value} was ${premium}`);
    }
  });

  it("always covers what EasyPost bills us", () => {
    // EasyPost charges about 55 cents per $100. Above the minimum, our price must beat their cost
    // at every value, or insured labels lose money.
    const EASYPOST_CENTS_PER_100 = 55;
    for (let value = 20_000; value <= INSURANCE_MAX_VALUE_CENTS; value += 1_000) {
      const ours = insurancePremiumCents(value);
      const theirs = Math.ceil((value * EASYPOST_CENTS_PER_100) / 10_000);
      assert.ok(ours > theirs, `at ${value} cents declared we charge ${ours} and pay ${theirs}`);
    }
  });

  it("rises with the declared value, never falls", () => {
    let previous = 0;
    for (let value = 0; value <= INSURANCE_MAX_VALUE_CENTS; value += 2_500) {
      const premium = insurancePremiumCents(value);
      assert.ok(premium >= previous, `premium fell from ${previous} to ${premium} at ${value}`);
      previous = premium;
    }
  });
});

describe("declared value limits", () => {
  it("accepts anything up to the cap", () => {
    assert.equal(insuranceValueError(0), null);
    assert.equal(insuranceValueError(INSURANCE_MAX_VALUE_CENTS), null);
  });

  it("refuses more than the carriers will underwrite", () => {
    assert.match(String(insuranceValueError(INSURANCE_MAX_VALUE_CENTS + 1)), /most we can insure/i);
  });

  it("refuses a negative value", () => {
    assert.ok(insuranceValueError(-1));
  });
});

describe("the quoted rate", () => {
  it("states the same numbers the code charges", () => {
    const label = insuranceRateLabel();
    assert.ok(label.includes((INSURANCE_CENTS_PER_100 / 100).toFixed(2)), `"${label}" does not state the rate`);
    assert.ok(label.includes((INSURANCE_MINIMUM_CENTS / 100).toFixed(2)), `"${label}" does not state the minimum`);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EASYPOST_INSURANCE_MINIMUM_CENTS,
  EASYPOST_INSURANCE_PERCENT,
  INSURANCE_MARKUP_PERCENT,
  INSURANCE_MAX_VALUE_CENTS,
  INSURANCE_MINIMUM_CENTS,
  easypostInsuranceCostCents,
  insurancePremiumCents,
  insuranceRateLabel,
  insuranceValueError,
} from "../src/lib/ship/insurance";

describe("what EasyPost charges us", () => {
  // Measured by buying test labels at each declared value and reading the InsuranceFee back.
  it("matches the fees EasyPost actually returned", () => {
    assert.equal(easypostInsuranceCostCents(5_000), 100); // $50 declared -> $1.00 (the floor)
    assert.equal(easypostInsuranceCostCents(10_000), 100); // $100 -> $1.00
    assert.equal(easypostInsuranceCostCents(50_000), 500); // $500 -> $5.00
    assert.equal(easypostInsuranceCostCents(200_000), 2_000); // $2,000 -> $20.00
  });

  it("is 1% of declared value, not the 0.55% an earlier version assumed", () => {
    assert.equal(EASYPOST_INSURANCE_PERCENT, 1);
    assert.equal(EASYPOST_INSURANCE_MINIMUM_CENTS, 100);
  });
});

describe("insurance premium", () => {
  it("is EasyPost's fee plus the markup", () => {
    for (const value of [10_000, 50_000, 123_400, 200_000, INSURANCE_MAX_VALUE_CENTS]) {
      const cost = easypostInsuranceCostCents(value);
      const expected = Math.ceil((cost * (100 + INSURANCE_MARKUP_PERCENT)) / 100);
      assert.equal(insurancePremiumCents(value), expected, `at ${value} cents declared`);
    }
  });

  it("prices the documented examples", () => {
    assert.equal(insurancePremiumCents(10_000), 170); // $100 declared -> $1.70
    assert.equal(insurancePremiumCents(50_000), 850); // $500 -> $8.50
    assert.equal(insurancePremiumCents(200_000), 3_400); // $2,000 -> $34.00
  });

  it("charges nothing when nothing is declared", () => {
    assert.equal(insurancePremiumCents(0), 0);
    assert.equal(insurancePremiumCents(null), 0);
    assert.equal(insurancePremiumCents(undefined), 0);
  });

  it("never sells cover below the floor", () => {
    assert.equal(insurancePremiumCents(1), INSURANCE_MINIMUM_CENTS);
    assert.equal(insurancePremiumCents(5_000), INSURANCE_MINIMUM_CENTS);
    assert.equal(INSURANCE_MINIMUM_CENTS, 170);
  });

  it("returns whole cents only — money is integers everywhere", () => {
    for (let value = 0; value <= INSURANCE_MAX_VALUE_CENTS; value += 997) {
      assert.ok(Number.isInteger(insurancePremiumCents(value)), `premium for ${value} was fractional`);
    }
  });

  it("always beats what EasyPost bills us, at every value", () => {
    // The whole point of the markup. The previous flat 70c-per-$100 price failed this: it charged
    // less than EasyPost's own 1%, so every insured label lost money.
    for (let value = 1_000; value <= INSURANCE_MAX_VALUE_CENTS; value += 1_000) {
      const ours = insurancePremiumCents(value);
      const theirs = easypostInsuranceCostCents(value);
      assert.ok(ours > theirs, `at ${value} cents declared we charge ${ours} and pay ${theirs}`);
      assert.ok(ours >= Math.floor(theirs * 1.7), `markup fell short at ${value}`);
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
    const per100 = (insurancePremiumCents(10_000) / 100).toFixed(2);
    assert.ok(label.includes(per100), `"${label}" does not state the real per-$100 price`);
    assert.ok(label.includes((INSURANCE_MINIMUM_CENTS / 100).toFixed(2)), `"${label}" does not state the minimum`);
  });
});

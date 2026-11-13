import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickupChargeKey, pickupChargePrefix, pickupFeeCents, pickupIdFromChargeKey } from "../src/lib/pickups/pricing";

const id = "3f1c2b7e-9a4d-4c11-8e2f-5b6a7c8d9e0f";

describe("pickup fee", () => {
  it("passes the carrier's fee through at cost", () => {
    assert.equal(pickupFeeCents(700), 700);
    assert.equal(pickupFeeCents(500), 500);
  });

  it("takes no charge for a free pickup or a missing price", () => {
    assert.equal(pickupFeeCents(0), 0);
    assert.equal(pickupFeeCents(null), 0);
    assert.equal(pickupFeeCents(undefined), 0);
    assert.equal(pickupFeeCents(Number.NaN), 0);
    assert.equal(pickupFeeCents(-50), 0);
  });

  it("returns whole cents", () => {
    assert.equal(pickupFeeCents(699.6), 700);
  });
});

describe("pickup charge keys", () => {
  it("gives every scheduling attempt its own key, so a retry never replays a cancelled hold", () => {
    assert.equal(pickupChargeKey(id, 0), `pickup:${id}:1`);
    assert.equal(pickupChargeKey(id, 1), `pickup:${id}:2`);
    assert.ok(pickupChargeKey(id, 4).startsWith(pickupChargePrefix(id)));
  });

  it("finds the pickup again from the charge, for the capture retry and the refund", () => {
    assert.equal(pickupIdFromChargeKey(pickupChargeKey(id, 2)), id);
  });

  it("does not mistake a label or batch charge for a pickup", () => {
    assert.equal(pickupIdFromChargeKey("label:abc"), null);
    assert.equal(pickupIdFromChargeKey(`batch:${id}`), null);
    assert.equal(pickupIdFromChargeKey(`pickup:${id}`), null);
  });
});

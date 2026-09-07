import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapEasyPostErrorForTest } from "../src/lib/shipping/easypost";

/**
 * The messages a seller actually reads when a void fails. A real void of a test-mode label with a
 * production key returned 404, and the app relayed "The requested resource could not be found." —
 * which sent us looking for a missing database row instead of an environment mismatch.
 */
describe("EasyPost error messages", () => {
  it("explains a 404 as an environment mismatch, not a missing record", () => {
    const e = mapEasyPostErrorForTest({ statusCode: 404, message: "The requested resource could not be found.", errors: [] });
    assert.match(e.message, /different EasyPost credentials/i);
    assert.ok(!/requested resource/i.test(e.message), "relayed EasyPost's raw wording");
  });

  it("explains a refused refund in plain words", () => {
    const e = mapEasyPostErrorForTest({ statusCode: 422, code: "SHIPMENT.REFUND.UNAVAILABLE", message: "Unable to request refund. The parcel has been shipped.", errors: [] });
    assert.match(e.message, /already been accepted into the mail stream/i);
  });

  it("still surfaces field detail on a bad address", () => {
    const e = mapEasyPostErrorForTest({ statusCode: 422, message: "x", errors: [{ field: "address", message: "Street is required" }] });
    assert.equal(e.code, "address_invalid");
    assert.match(e.message, /Street is required/);
  });

  it("marks a rate limit and a server error retryable", () => {
    assert.equal(mapEasyPostErrorForTest({ statusCode: 429, message: "slow down" }).retryable, true);
    assert.equal(mapEasyPostErrorForTest({ statusCode: 503, message: "down" }).retryable, true);
  });
});

import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { publicCarrierNote, publicCarrierNotes } from "../src/lib/shipping/messages";

describe("public carrier notes", () => {
  test("says nothing about an account we have not finished configuring", () => {
    assert.equal(publicCarrierNote("DhlEcs: shipment.options.merchant_id is required"), null);
  });

  test("says nothing about a lane the carrier structurally does not serve", () => {
    assert.equal(
      publicCarrierNote("USAExportPBA: shipment: ['shipment.from_address.country: This carrier only support shipments from US origins to international destinations.']"),
      null,
    );
    assert.equal(publicCarrierNote("CanadaPost: ['Unable to get rates for shipments originating outside of Canada.']"), null);
  });

  test("names the carrier in plain words for anything else", () => {
    assert.equal(
      publicCarrierNote("UPSDAP: UPS returned the error message: Missing ship from state province code."),
      "UPS didn't quote this package.",
    );
  });

  test("never leaks the carrier's own wording", () => {
    const raw = "UPSDAP: UPS returned the error message: Missing ship from state province code.";
    const note = publicCarrierNote(raw)!;
    for (const leak of ["state province", "error message", "shipment.", "options.", "_id"]) {
      assert.ok(!note.includes(leak), `note leaked ${leak}: ${note}`);
    }
  });

  test("a message with no carrier prefix is not worth showing", () => {
    assert.equal(publicCarrierNote("something went wrong"), null);
    assert.equal(publicCarrierNote(": orphaned"), null);
  });

  test("two accounts of the same carrier produce one sentence", () => {
    const notes = publicCarrierNotes([
      "UPSDAP: UPS returned the error message: Missing ship from state province code.",
      "UPSSurePost: UPS returned the error message: Missing ship from state province code.",
      "DhlEcs: shipment.options.merchant_id is required",
    ]);
    assert.deepEqual(notes, ["UPS didn't quote this package."]);
  });

  test("the real production message set shows nothing at all", () => {
    // Exactly what shipwithsnap.com printed under the rate list on 9 Sept 2026.
    assert.deepEqual(publicCarrierNotes([
      "DhlEcs: shipment.options.merchant_id is required",
      "USAExportPBA: shipment: ['shipment.from_address.country: This carrier only support shipments from US origins to international destinations.']",
      "CanadaPost: ['Unable to get rates for shipments originating outside of Canada.']",
    ]), []);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stateForZip } from "../src/lib/ship/zip-state";

describe("state from ZIP", () => {
  // Spread across the table, including the ends of ranges and the awkward ones.
  const known: Array<[string, string]> = [
    ["75229", "TX"], ["76179", "TX"], ["78704", "TX"], ["79999", "TX"], ["88595", "TX"],
    ["11201", "NY"], ["10001", "NY"], ["14999", "NY"],
    ["94104", "CA"], ["90210", "CA"], ["96162", "CA"],
    ["02101", "MA"], ["02801", "RI"], ["03301", "NH"], ["04101", "ME"], ["05601", "VT"],
    ["06101", "CT"], ["07001", "NJ"], ["15201", "PA"], ["19801", "DE"], ["20001", "DC"],
    ["21201", "MD"], ["23218", "VA"], ["25301", "WV"], ["27601", "NC"], ["29201", "SC"],
    ["30301", "GA"], ["33101", "FL"], ["35201", "AL"], ["37201", "TN"], ["39201", "MS"],
    ["39901", "GA"], ["40202", "KY"], ["43201", "OH"], ["46201", "IN"], ["48201", "MI"],
    ["50301", "IA"], ["53201", "WI"], ["55401", "MN"], ["57101", "SD"], ["58102", "ND"],
    ["59101", "MT"], ["60601", "IL"], ["63101", "MO"], ["66101", "KS"], ["68101", "NE"],
    ["70112", "LA"], ["72201", "AR"], ["73101", "OK"], ["80202", "CO"], ["82001", "WY"],
    ["83254", "ID"], ["84101", "UT"], ["85001", "AZ"], ["87101", "NM"], ["89101", "NV"],
    ["96801", "HI"], ["97201", "OR"], ["98101", "WA"], ["99501", "AK"], ["00907", "PR"],
  ];

  for (const [zip, state] of known) {
    it(`${zip} is ${state}`, () => assert.equal(stateForZip(zip), state));
  }

  it("returns null rather than guessing on an unassigned prefix", () => {
    assert.equal(stateForZip("42999"), null); // 428-429 unassigned
    assert.equal(stateForZip("00001"), null);
  });

  it("returns null for anything that is not a 5-digit ZIP", () => {
    for (const bad of ["", "1234", "abcde", "123456", "SW1A 2AA"]) assert.equal(stateForZip(bad), null);
  });

  it("accepts ZIP+4 by taking the first five digits", () => {
    assert.equal(stateForZip("76179-2099"), "TX");
  });
});

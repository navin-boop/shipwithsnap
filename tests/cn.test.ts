import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cn } from "../src/lib/cn";

/**
 * These pin the behaviour a plain string join did not have. The Printing settings card was
 * unreadable because a conditional `bg-ink` lost to the base `bg-surface` it was meant to replace.
 */
describe("cn resolves Tailwind conflicts", () => {
  it("lets the later background win", () => {
    assert.equal(cn("bg-surface", "bg-ink"), "bg-ink");
    assert.equal(cn("bg-surface p-5", false && "x", "bg-yellow"), "p-5 bg-yellow");
  });

  it("lets the later text colour win", () => {
    assert.equal(cn("text-muted", "text-ink"), "text-ink");
  });

  it("lets the later border colour win", () => {
    assert.equal(cn("border-ink", "border-coral"), "border-coral");
  });

  it("knows the project's own radius scale", () => {
    // Without the theme extension these are treated as unrelated and both survive.
    assert.equal(cn("rounded-card", "rounded-pill"), "rounded-pill");
    assert.equal(cn("rounded-field", "rounded-row"), "rounded-row");
  });

  it("leaves the project's component utilities alone", () => {
    // `card`, `card-quiet`, `offset-shadow`, `disp` and `lbl` are whole components, not scales —
    // merging them away would strip the outline and shadow off every card.
    assert.equal(cn("card", "bg-yellow"), "card bg-yellow");
    assert.equal(cn("card-quiet", "border-coral"), "card-quiet border-coral");
    assert.equal(cn("offset-shadow", "bg-coral"), "offset-shadow bg-coral");
    assert.equal(cn("disp", "text-lg"), "disp text-lg");
    assert.equal(cn("lbl", "text-danger"), "lbl text-danger");
  });

  it("still skips falsy values", () => {
    assert.equal(cn("a", false, null, undefined, "b"), "a b");
    assert.equal(cn(), "");
  });

  it("keeps unrelated classes", () => {
    assert.equal(cn("flex flex-col gap-2", "bg-surface"), "flex flex-col gap-2 bg-surface");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CODE_LENGTH, CODE_TTL_MINUTES, MAX_ATTEMPTS, checkFailureMessage, generateCode } from "../src/lib/auth/verification";
import { verifyEmail } from "../src/lib/email/templates";

describe("verification codes", () => {
  it("is always exactly six digits", () => {
    for (let i = 0; i < 2000; i++) {
      const code = generateCode();
      assert.equal(code.length, CODE_LENGTH, `"${code}" is not ${CODE_LENGTH} characters`);
      assert.match(code, /^\d+$/, `"${code}" is not all digits`);
    }
  });

  it("zero-pads: a leading zero must survive", () => {
    // One draw in ten starts with a zero, so 2000 draws without one means padding is broken.
    const codes = Array.from({ length: 2000 }, generateCode);
    assert.ok(codes.some((c) => c.startsWith("0")), "no code started with 0 — the zero padding is missing");
  });

  it("does not repeat itself", () => {
    const codes = new Set(Array.from({ length: 500 }, generateCode));
    assert.ok(codes.size > 450, "codes are not random enough");
  });
});

describe("verification failure messages", () => {
  const reasons = ["no_code", "expired", "too_many_attempts", "wrong"] as const;

  it("says something specific for every failure", () => {
    const seen = new Set<string>();
    for (const reason of reasons) {
      const message = checkFailureMessage({ ok: false, reason, attemptsLeft: 3 });
      assert.ok(message.length > 10, `${reason} has no message`);
      assert.ok(!seen.has(message), `${reason} repeats another reason's message`);
      seen.add(message);
    }
  });

  it("warns on the last attempt", () => {
    const last = checkFailureMessage({ ok: false, reason: "wrong", attemptsLeft: 1 });
    assert.match(last, /one try left/i);
  });

  it("tells the user how long a code lasts when one expires", () => {
    assert.match(checkFailureMessage({ ok: false, reason: "expired" }), new RegExp(String(CODE_TTL_MINUTES)));
  });

  it("caps guesses well below brute force", () => {
    assert.ok(MAX_ATTEMPTS <= 10, "too many guesses allowed against a six-digit code");
  });
});

describe("verification email", () => {
  const email = verifyEmail({ code: "048213", email: "you@example.com", expiresInMinutes: CODE_TTL_MINUTES });

  it("puts the code in the subject, so it is readable from the notification", () => {
    assert.ok(email.subject.startsWith("048213"));
  });

  it("shows the code in the body and the plain-text twin", () => {
    assert.ok(email.html.includes("048213"));
    assert.ok(email.text.includes("048213"));
  });

  it("tells the reader what to do if they did not sign up", () => {
    assert.match(email.html, /Didn&#39;t sign up\?/);
  });
});

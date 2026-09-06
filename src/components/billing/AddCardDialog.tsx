"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useState } from "react";
import { Button } from "@/components/ui";
import { finishAddCard, startAddCard } from "@/lib/billing/actions";

// Card entry via Stripe Elements. The number never reaches our servers — Elements posts it
// straight to Stripe and hands back a payment method id, which is all we store.

let stripePromise: Promise<Stripe | null> | null = null;
function stripeClient(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

export function AddCardButton({ publishableKey, onAdded, label = "Add card" }: { publishableKey: string | null; onAdded: () => void; label?: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  if (!publishableKey) {
    return <div className="text-[13px] font-bold text-muted">Card entry needs the Stripe publishable key set on the deployment.</div>;
  }

  async function open() {
    setOpening(true);
    setError(null);
    const res = await startAddCard();
    setOpening(false);
    if (res.ok) setClientSecret(res.clientSecret);
    else setError(res.error);
  }

  if (!clientSecret) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" className="self-start" disabled={opening} onClick={open}>{opening ? "Opening…" : label}</Button>
        {error && <div className="text-[13px] font-bold text-danger">{error}</div>}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripeClient(publishableKey)}
      options={{
        clientSecret,
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#ff5c39",
            colorBackground: "#ffffff",
            colorText: "#2b2320",
            colorDanger: "#d93a2b",
            fontFamily: "Nunito, system-ui, sans-serif",
            borderRadius: "14px",
            spacingUnit: "5px",
          },
        },
      }}
    >
      <CardForm onDone={() => { setClientSecret(null); onAdded(); }} onCancel={() => setClientSecret(null)} />
    </Elements>
  );
}

function CardForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    // Any 3D Secure challenge happens here, once, so later charges run without prompting.
    const { error: stripeError, setupIntent } = await stripe.confirmSetup({ elements, redirect: "if_required" });
    if (stripeError) {
      setError(stripeError.message ?? "That card could not be saved.");
      setBusy(false);
      return;
    }
    const pm = typeof setupIntent?.payment_method === "string" ? setupIntent.payment_method : setupIntent?.payment_method?.id;
    if (!pm) {
      setError("Stripe did not return a card to save.");
      setBusy(false);
      return;
    }
    const saved = await finishAddCard(pm);
    setBusy(false);
    if (saved.ok) onDone();
    else setError(saved.error);
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="lbl">New card</div>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <div className="text-[13px] font-bold text-danger">{error}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="md" disabled={!stripe || busy} onClick={submit}>{busy ? "Saving…" : "Save card"}</Button>
        <button type="button" className="text-[13px] font-extrabold text-muted" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
      <p className="text-[13px] font-bold text-muted">Stripe stores the card. Snap never sees the number.</p>
    </div>
  );
}

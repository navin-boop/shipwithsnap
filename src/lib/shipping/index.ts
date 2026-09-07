import { EasyPostProvider } from "./easypost";
import { FakeProvider } from "./fake";
import { ProviderError, type BuyRequest, type ShippingProvider } from "./provider";

export * from "./provider";
export * from "./options";

let cached: ShippingProvider | undefined;

/**
 * EasyPost when EASYPOST_API_KEY is set; otherwise the in-memory fake so the product works
 * locally and in tests without credentials.
 *
 * Safety, in both directions:
 *
 * EasyPost production keys start with "EZAK" and buy real postage. Rating and address
 * verification are free, so they work with any key, but outside a production deployment a
 * buy (label, order or pickup) with a live key is refused unless ALLOW_LIVE_EASYPOST=1 is set.
 *
 * The inverse is worse and used to be unguarded: a TEST EasyPost key on the production
 * deployment while Stripe holds a live key charges a real customer real money for a label no
 * carrier will ever accept — and which cannot even be voided afterwards, because the shipment
 * lives in EasyPost's test world. That combination is refused too, unless
 * ALLOW_TEST_EASYPOST_IN_PROD=1 says it is deliberate.
 */
export function getShippingProvider(): ShippingProvider {
  if (!cached) {
    const key = process.env.EASYPOST_API_KEY;
    if (!key) {
      cached = new FakeProvider();
    } else {
      const provider = new EasyPostProvider(key);
      const inProd = process.env.VERCEL_ENV === "production";
      const liveStripe = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live");

      const liveKeyOutsideProd = key.startsWith("EZAK") && !inProd && process.env.ALLOW_LIVE_EASYPOST !== "1";
      const testKeyChargingRealCards = !key.startsWith("EZAK") && inProd && liveStripe && process.env.ALLOW_TEST_EASYPOST_IN_PROD !== "1";

      const reason = liveKeyOutsideProd
        ? "Refusing to buy real postage: EASYPOST_API_KEY is a production key (EZAK…). Use the EasyPost TEST key (EZTK…) in development."
        : testKeyChargingRealCards
          ? "Refusing to buy: EASYPOST_API_KEY is an EasyPost TEST key but this deployment charges live cards. The label would cost the customer real money and no carrier would accept it. Set the production key (EZAK…)."
          : null;

      if (reason) {
        const refuse = () => { throw new ProviderError("unknown", reason); };
        provider.buy = async (_req: BuyRequest) => refuse();
        provider.buyOrder = async () => refuse();
        provider.buyPickup = async () => refuse();
      }
      cached = provider;
    }
  }
  return cached;
}

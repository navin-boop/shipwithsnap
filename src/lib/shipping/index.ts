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
 * Safety: EasyPost production keys start with "EZAK" and buy real postage. Rating and address
 * verification are free, so they work with any key, but outside a production deployment a
 * buy (label, order or pickup) with a live key is refused unless ALLOW_LIVE_EASYPOST=1 is set.
 */
export function getShippingProvider(): ShippingProvider {
  if (!cached) {
    const key = process.env.EASYPOST_API_KEY;
    if (!key) {
      cached = new FakeProvider();
    } else {
      const provider = new EasyPostProvider(key);
      const liveKeyOutsideProd = key.startsWith("EZAK") && process.env.VERCEL_ENV !== "production";
      if (liveKeyOutsideProd && process.env.ALLOW_LIVE_EASYPOST !== "1") {
        const refuse = () => {
          throw new ProviderError("unknown", "Refusing to buy real postage: EASYPOST_API_KEY is a production key (EZAK…). Use the EasyPost TEST key (EZTK…) in development.");
        };
        provider.buy = async (_req: BuyRequest) => refuse();
        provider.buyOrder = async () => refuse();
        provider.buyPickup = async () => refuse();
      }
      cached = provider;
    }
  }
  return cached;
}

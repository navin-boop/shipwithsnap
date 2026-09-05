# Carrier logos

Drop the official logo files here and the app picks them up automatically (no code change):

| File | Carrier | Where to get it |
|---|---|---|
| `usps.svg` | USPS | USPS Brand Guidelines / licensing — usps.com → "Rights & Permissions". The Eagle logo needs written permission; the "USPS" wordmark in text is fine without. |
| `ups.svg` | UPS | UPS Brand Central (brand.ups.com) — request the shield; usage is subject to their approval. |
| `fedex.svg` | FedEx | FedEx Brand Identity / developer resources — the wordmark may be used to indicate FedEx services with their guidelines. |
| `dhl.svg` | DHL | DHL brand portal, if you add DHL via EasyPost. |

Rules of thumb from the carriers' guidelines: never alter colours or proportions, keep clear space, don't imply endorsement. Square-ish SVGs (or ones with generous padding) look best in the 44px tile.

Until a file is present, `CarrierLogo` shows a text badge ("USPS", "UPS", "FedEx").

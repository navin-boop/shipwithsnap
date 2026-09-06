# Carrier logos

`CarrierLogo` renders a carrier mark in two ways, and it picks the first that is available.

## 1. The official logo (optional — drop a file in here)

Put the carrier's own SVG in this folder and it is used everywhere immediately, with no code change:

| File | Carrier | Where to get it |
|---|---|---|
| `usps.svg` | USPS | usps.com → "Rights & Permissions". The Eagle logo needs **written permission**; the "USPS" wordmark as text does not. |
| `ups.svg` | UPS | UPS Brand Central (brand.ups.com). The shield is released **on approval** of your request. |
| `fedex.svg` | FedEx | FedEx brand identity resources. The wordmark may be used to indicate FedEx services within their guidelines. |
| `dhl.svg` | DHL | DHL brand portal. |

Square-ish files, or ones with generous internal padding, sit best in the tile. Never alter a carrier's
colours or proportions, keep their required clear space, and never imply endorsement.

## 2. Our own mark (the default, no permission needed)

With no file present, we draw the carrier's name in our own typeface on the carrier's published
brand colour:

| Carrier | Background | Text |
|---|---|---|
| USPS | `#004B87` | white |
| UPS | `#351C15` | `#FFB500` |
| FedEx | `#4D148C` | white |
| DHL | `#FFCC00` | `#D40511` |

This identifies whose service a rate belongs to without reproducing artwork that USPS and UPS
require permission for. It is the same nominative use the trademark disclaimer in the site footer
describes. The mark is an SVG with a `viewBox`, and `textLength` compresses the name to fit, so it
stays sharp and legible from the 22px chips up to the 56px tile on a shipment.

To add a carrier, add it to `SLUG` and `BRAND` in `src/components/ui/CarrierLogo.tsx`. An unknown
carrier falls back to ink and paper, so nothing ever breaks.

# Carrier logos

`CarrierLogo` renders a carrier mark in two ways, and it picks the first that is available.

## 1. The official logo (drop a file in here)

Put the carrier's own SVG in this folder and it is used everywhere immediately, with no code change.

| File | Carrier | Status |
|---|---|---|
| `ups.svg` | UPS | **Present** — 2017 shield |
| `fedex.svg` | FedEx | **Present** — FedEx Express wordmark |
| `dhl.svg` | DHL | **Present** — red wordmark on the yellow bar |
| `usps.svg` | USPS | Missing — falls back to our own mark |
| `canadapost.svg` | Canada Post | Missing — falls back to our own mark |

The three present files came from Wikimedia Commons, not from a carrier brand portal. They are
accurate and unmodified, but they are community reproductions rather than the approved artwork.
**Replace them with the files from each carrier's brand portal** — brand.ups.com for UPS, FedEx
brand identity resources, the DHL brand portal — since that is what a permission grant actually
covers. Same filenames, no code change.

USPS and Canada Post are still missing because their marks are not available under a free licence
anywhere public; request them from usps.com "Rights & Permissions" and the Canada Post brand team,
and drop them in as `usps.svg` and `canadapost.svg`.

Never alter a carrier's colours or proportions, keep their required clear space, and never imply
endorsement.

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
| Canada Post | `#DA291C` | white |

This identifies whose service a rate belongs to without reproducing artwork that USPS and UPS
require permission for. It is the same nominative use the trademark disclaimer in the site footer
describes. The mark is an SVG with a `viewBox`, and `textLength` compresses the name to fit, so it
stays sharp and legible from the 22px chips up to the 56px tile on a shipment.

To add a carrier, add it to `SLUG` and `BRAND` in `src/components/ui/CarrierLogo.tsx`. An unknown
carrier falls back to ink and paper, so nothing ever breaks.

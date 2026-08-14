# Lease Scout

Lease Scout is a mobile-first lease-deal explorer. It retrieves public offers from Leasehackr's **PND** pages, ranks them using a transparent effective-cost score, and lets shoppers filter, compare, and sanity-check offers.

> Lease Scout is an independent project and is not affiliated with Leasehackr, vehicle manufacturers, or dealers. Deal details, incentives, availability, and eligibility must be confirmed with the offer source and dealer before signing.

## What it does

- Retrieves current public Leasehackr offers through `GET /api/deals`
- Ranks offers by an effective monthly cost as a share of MSRP
- Filters by state, MSRP, monthly payment, upfront payment, annual mileage, brand, model, and trim
- Shows the top 10 results first, with incremental loading
- Displays known conditional rebates only when a named rebate is present
- Calculates a score for an external offer entered by the user
- Compares selected trims by current offer, score, MSRP, upfront payment, and estimated monthly outlay

## Score calculation

Lower is better:

```text
score (%) = ((upfront payment / lease term in months) + monthly payment) / MSRP × 100
```

The comparison view uses:

```text
estimated monthly outlay = monthly payment + (upfront payment / lease term)
```

These are quick comparison aids, not total-cost-of-ownership estimates. They do not account for tax treatment, acquisition/disposition fees, registration, insurance, mileage overages, or all incentive conditions.

## Stack

- React 19 with Vinext
- Cloudflare Workers for the application and `/api/deals` endpoint
- TypeScript
- CSS designed for an iPhone-sized, responsive interface

## Local development

### Requirements

- Node.js 22.13 or newer
- npm

### Install and run

```bash
npm install
npm run dev
```

Open the local address printed by the development server. The page fetches live deals from the Worker endpoint; a working internet connection is required.

### Useful commands

```bash
npm run build   # production build
npm run lint    # lint the project
npm test        # build and run the rendered-page test
```

## Project structure

```text
app/
  page.tsx          Main Lease Scout UI, filters, deal checker, and comparison view
  globals.css        Responsive visual design
  layout.tsx         Application layout and metadata
worker/
  index.ts           Worker entry point and Leasehackr PND parsing endpoint
public/              Static assets
.openai/hosting.json Sites deployment configuration
```

## Data flow

1. The browser calls `/api/deals` when the app loads or refreshes.
2. The Worker fetches public Leasehackr PND regional pages.
3. The Worker parses the public offer cards, decodes HTML entities, de-duplicates offers, and returns JSON.
4. The browser filters and ranks the returned offers locally.

The Worker requests are cached at Cloudflare for up to five minutes, though the API response is marked `no-store` so the app itself always asks for a fresh response.

## Deployment

This project is configured for OpenAI Sites. Keep `.openai/hosting.json` when deploying back to the same Sites project.

For a GitHub repository, commit the application source and configuration files, including `app/`, `worker/`, `public/`, `package.json`, `package-lock.json`, and build configuration. Do not commit `node_modules/`, build output, `.wrangler/`, or any `.env` files and secrets.

For a custom domain, configure the DNS records issued by the hosting provider, then wait for domain verification and SSL provisioning to complete.

## Limitations and responsible use

- Source pages can change format, so the parser may need maintenance.
- An offer may be regional, expired, conditional, or available only to certain customers.
- A listed trim may not represent every package or vehicle configuration.
- Lease Scout should not be treated as financial, legal, tax, or purchasing advice.

## License

No license has been selected yet. Add a license file before publishing the repository for public reuse.

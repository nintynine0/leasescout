# Lease Scout

Lease Scout is a Codex-writing lease-deal explorer. It retrieves public offers from Leasehackr's pages, ranks them using a transparent effective-cost score, and lets shoppers filter, compare, and sanity-check offers.

> Lease Scout is an independent project and is not affiliated with Leasehackr, vehicle manufacturers, or dealers. Deal details, incentives, availability, and eligibility must be confirmed with the offer source and dealer before signing.

## Score calculation

Lower is better:

```text
score (%) = ((upfront payment / lease term in months) + monthly payment) / MSRP × 100
```

These are quick comparison aids, not total-cost-of-ownership estimates. They do not account for tax treatment, acquisition/disposition fees, registration, insurance, mileage overages, or all incentive conditions.

## Limitations and responsible use

- Source pages can change format, so the parser may need maintenance.
- An offer may be regional, expired, conditional, or available only to certain customers.
- A listed trim may not represent every package or vehicle configuration.
- Lease Scout should not be treated as financial, legal, tax, or purchasing advice.

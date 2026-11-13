# Customer order history

The `/orders-history` route uses `CheckoutService` and Strapi customer JWTs.
The old `OrderHistoryService` remains for the existing admin screens; customer
history no longer calls the legacy email/tracking-number endpoints.

- `GET /api/checkout/orders` loads 10 orders per page, with server-side search
  by order number and a status filter. Responses include pagination metadata.
- `GET /api/checkout/orders/:documentId` opens saved product, price, address,
  payment and shipping snapshots. Both endpoints enforce JWT ownership.
- `POST /api/checkout/orders/:documentId/receipt` reuses the checkout receipt
  workflow for unpaid bank-transfer orders that have not expired. Submitting
  changes the screen to awaiting review, rather than marking an order paid.

The page supports loading, no orders, no matching results, retries, responsive
cards, a placeholder for missing product images, and dates in Thailand time.
Details expand inside each order card, without a fixed-width modal.

Restart the backend after updating so bootstrap grants the `history` action to
the Authenticated role. Customers do not need management/API tokens.

Validation:
- Backend: `npm run check:checkout` covers history ownership, unauthenticated
  access, pagination, search, status filtering and the existing checkout flow.
- Frontend: `npm test -- --watch=false --browsers=ChromeHeadless
  --include=src/app/components/orders-history/orders-history.component.spec.ts
  --include=src/app/components/checkout-form/checkout-form.component.spec.ts`.
- `npm run build` checks the production bundle and Angular templates.

# Strapi storefront integration (phase 1)

The existing Angular 17 / Bootstrap 5 screens now use Strapi for customer login,
category navigation, product listing, name search and product detail.

## Run locally

1. Start the sibling `senior-rmutp-backend` with `npm run dev` (port 1337).
2. Run `npm start` in this frontend (port 4200).
3. Log in using an existing Strapi **Users & Permissions** customer account,
   with its username or email. Strapi admin panel accounts and old backend
   credentials are separate. No accounts or passwords are migrated here.

Set `strapiUrl` in `src/environments/environment.ts` and
`src/environments/environment.development.ts` for another server. Production
also needs the deployed Strapi URL. `baseUrl` remains the old API URL for the
features outside this phase.

## API contract

- `POST /api/auth/local`: `{ identifier, password }` returns `{ jwt, user }`.
- `GET /api/catalog/categories`: published, active categories ordered by sortOrder.
- `GET /api/catalog/products`: published, active products. Optional `category`
  (actual category numeric id), `search` (case insensitive name), `page` and
  `pageSize` (1–100). Returns `{ data, meta: { pagination } }`.
- `GET /api/catalog/products/:documentId`: a published, active product or 404.

Catalog endpoints are public, read only, and use fixed fields and relations.
They need no extra Public role permissions and do not expose write routes.
The frontend combines API pages for the existing six-card paginator.

`catalog-api.ts` maps product/variant/media data to the original `Product` model.
Cards show the lowest priced active variant, available stock
(`stockOnHand - stockReserved`), and a local placeholder when no image exists.
The detail URL uses Strapi documentId. The menu uses actual category ids;
the old hardcoded male=1/female=2/unisex=3 assumptions are removed.

The existing session key `jwtResponse` remains, holding the mapped token and
customer user. Strapi JWTs contain an id rather than an embedded user. Expired,
malformed and legacy sessions require login again. Strapi customer login maps
to the existing ROLE_USER display; it does not grant legacy admin access.

Registration, cart/checkout API integration, order history, payments, uploads,
and product administration still use their existing implementations and are
outside this phase. Cart contents are not a Strapi checkout contract.

## Verification

Frontend: `npm run build` and `npm test -- --watch=false --browsers=ChromeHeadless`.
Set `CHROME_BIN` if needed. Backend: `npx tsc --noEmit` and
`node scripts/check-storefront.cjs`. Run the latter on a development/test database
with the demo catalog seeded; it creates temporary test users/products and
removes them in its cleanup step.

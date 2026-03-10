# Tennjor Backend API Contract

## Overview

This document describes the current HTTP API exposed by the NestJS backend in this repository, based on controllers, DTOs, services, and Prisma schema.

Audience:

- Human frontend developers integrating Tennjor UI flows.
- AI coding agents generating frontend API clients and UI data handling.

API domains covered:

- Authentication
- Public catalog (categories/products)
- Admin catalog management
- Quote requests (public create + admin management)
- Admin dashboard stats
- Internal sales quotes and completed sales (admin)
- Utility endpoints (`/`, `/users`)

Data store is PostgreSQL via Prisma.

- Base URL: `http://localhost:3000` by default in local dev (from `main.ts` listening on `process.env.PORT ?? 3000`).
- No global prefix (routes are mounted exactly as defined in controllers).
- Content type: `application/json`.
- Authenticated endpoints require:
  - `Authorization: Bearer <accessToken>`

CORS:

- CORS is enabled with `origin: true` and `credentials: true`.

## Internal Sales Domain

Implemented in this step:

- Prisma schema foundation for internal commercial workflow.
- New tables/models:
  - `InternalSaleQuote`
  - `InternalSaleQuoteItem`
  - `InternalSaleQuoteNote`
  - `CompletedSale`
  - `CompletedSaleItem`
- New enums:
  - `InternalSaleQuoteStatus`
  - `CompletedSaleStatus`
  - `DiscountType`
- Migration added for table creation, enums, indexes, and relations.
- Working backend routes for internal sales quotes:
  - quote create/list/detail/update
  - quote item add/update/delete
  - quote totals recalculate
  - quote completion into finalized sale
  - quote-request to sales-quote conversion (`/admin/quote-requests/:id/convert-to-sales-quote`)
- Working backend routes for completed sales read layer:
  - list completed sales
  - get completed sale detail

Not implemented in this step:

- Reporting/export for completed sales is not implemented yet.

Design notes:

- This internal sales domain remains separate from public `QuoteRequest`.
- `InternalSaleQuote` can optionally reference `QuoteRequest` (`publicQuoteRequestId`) for lead traceability.
- Monetary fields are snapshot-oriented to preserve historical revenue/cost/profit accuracy independent of later catalog changes.

Planned next endpoints (future PR, not implemented now):

- Completed sales reporting/export endpoints

## Authentication

### Login

- Endpoint: `POST /auth/login`
- Body:
  - `email` (valid email, required)
  - `password` (string, min length 6, required)
- Success response:
  - `accessToken` (JWT)
  - `user` `{ id, email, name, role }`

JWT details:

- Token source: `Authorization` Bearer header.
- Signature secret: `JWT_SECRET` (fallback exists in module config, but strategy throws if env var missing).
- Expiration: `JWT_EXPIRES_IN` or default `1d`.

Admin authorization:

- Most admin JSON endpoints currently enforce JWT auth only.
- CSV export endpoints enforce JWT + explicit ADMIN role guard (`AdminRoleGuard`).

## Global Validation Rules

Global `ValidationPipe` settings:

- `whitelist: true`: strips unknown fields from DTO-bound payloads.
- `forbidNonWhitelisted: true`: rejects requests containing unknown fields.
- `transform: true`: query/body values are transformed to DTO types (`Number`, `Boolean`, nested DTOs).

General implications:

- Query params like `page`, `limit`, booleans are type-coerced where DTO uses `@Type(...)`.
- Sending extra fields to DTO endpoints returns `400 Bad Request`.

Common validation constraints used:

- IDs/slugs are plain strings unless explicitly constrained otherwise.
- URL fields require valid URL format (`@IsUrl`).
- Numeric pagination and stock/order/quantity fields require integer + min constraints.
- Enum fields must match Prisma enums exactly.

## Endpoint Summary Table

| Method | Path                                               | Auth required | Admin only    | Description                                     |
| ------ | -------------------------------------------------- | ------------- | ------------- | ----------------------------------------------- |
| GET    | `/`                                                | No            | No            | Health-like hello string                        |
| GET    | `/users`                                           | No            | No            | List users (safe fields)                        |
| POST   | `/auth/login`                                      | No            | No            | Authenticate and get JWT                        |
| GET    | `/catalog/categories`                              | No            | No            | Public active categories (filtered)             |
| GET    | `/catalog/products`                                | No            | No            | Public active products list                     |
| GET    | `/catalog/products/:slug`                          | No            | No            | Public product detail by slug                   |
| POST   | `/quote-requests`                                  | No            | No            | Create quote request                            |
| GET    | `/admin/dashboard/stats`                           | Yes           | No (JWT only) | Dashboard KPIs                                  |
| GET    | `/admin/dashboard/stats/export/csv`                | Yes           | Yes           | Download dashboard stats + quote requests CSV   |
| POST   | `/admin/sales-quotes`                              | Yes           | Yes           | Create internal sale quote draft                |
| GET    | `/admin/sales-quotes`                              | Yes           | Yes           | List internal sale quotes                       |
| GET    | `/admin/sales-quotes/:id`                          | Yes           | Yes           | Get internal sale quote detail                  |
| PATCH  | `/admin/sales-quotes/:id`                          | Yes           | Yes           | Update internal sale quote header (DRAFT)       |
| POST   | `/admin/sales-quotes/:id/items`                    | Yes           | Yes           | Add internal sale quote item                    |
| PATCH  | `/admin/sales-quotes/:id/items/:itemId`            | Yes           | Yes           | Update internal sale quote item                 |
| DELETE | `/admin/sales-quotes/:id/items/:itemId`            | Yes           | Yes           | Delete internal sale quote item                 |
| POST   | `/admin/sales-quotes/:id/recalculate`              | Yes           | Yes           | Recalculate internal sale quote totals          |
| POST   | `/admin/sales-quotes/:id/internal-notes`           | Yes           | Yes           | Add internal note to sales quote                |
| POST   | `/admin/sales-quotes/:id/complete-sale`            | Yes           | Yes           | Complete quote into finalized sale snapshot     |
| GET    | `/admin/sales`                                     | Yes           | Yes           | List completed sales                            |
| GET    | `/admin/sales/stats`                               | Yes           | Yes           | Get completed sales aggregated stats            |
| GET    | `/admin/sales/export/csv`                          | Yes           | Yes           | Export completed sales CSV                      |
| GET    | `/admin/sales/:id`                                 | Yes           | Yes           | Get completed sale detail                       |
| GET    | `/admin/products`                                  | Yes           | No (JWT only) | Admin product list                              |
| GET    | `/admin/products/export/csv`                       | Yes           | Yes           | Download products CSV                           |
| GET    | `/admin/products/:id`                              | Yes           | No (JWT only) | Admin product detail                            |
| POST   | `/admin/products`                                  | Yes           | No (JWT only) | Create product                                  |
| PATCH  | `/admin/products/:id`                              | Yes           | No (JWT only) | Update product                                  |
| DELETE | `/admin/products/:id`                              | Yes           | No (JWT only) | Delete product and related catalog data         |
| POST   | `/admin/products/:productId/variants`              | Yes           | No (JWT only) | Create product variant                          |
| POST   | `/admin/products/:productId/variants/bulk`         | Yes           | No (JWT only) | Bulk create product variants by size range      |
| PATCH  | `/admin/variants/:id`                              | Yes           | No (JWT only) | Update product variant                          |
| DELETE | `/admin/variants/:id`                              | Yes           | No (JWT only) | Delete product variant                          |
| POST   | `/admin/products/:productId/images`                | Yes           | No (JWT only) | Create product image                            |
| PATCH  | `/admin/product-images/:id`                        | Yes           | No (JWT only) | Update product image                            |
| DELETE | `/admin/product-images/:id`                        | Yes           | No (JWT only) | Delete product image                            |
| GET    | `/admin/categories`                                | Yes           | No (JWT only) | Admin category list                             |
| GET    | `/admin/categories/export/csv`                     | Yes           | Yes           | Download categories CSV                         |
| GET    | `/admin/categories/:id`                            | Yes           | No (JWT only) | Admin category detail                           |
| POST   | `/admin/categories`                                | Yes           | No (JWT only) | Create category                                 |
| PATCH  | `/admin/categories/:id`                            | Yes           | No (JWT only) | Update category                                 |
| DELETE | `/admin/categories/:id`                            | Yes           | No (JWT only) | Delete category and nested catalog data         |
| GET    | `/admin/quote-requests`                            | Yes           | No (JWT only) | Admin quote requests list                       |
| GET    | `/admin/quote-requests/:id`                        | Yes           | No (JWT only) | Admin quote request detail                      |
| PATCH  | `/admin/quote-requests/:id/status`                 | Yes           | No (JWT only) | Update quote request status                     |
| POST   | `/admin/quote-requests/:id/convert-to-sales-quote` | Yes           | Yes           | Convert quote request into internal sales quote |

## Detailed Endpoints

### GET `/`

- Purpose: Basic service response.
- Auth requirements: None.
- Params: None.
- Query: None.
- Request body: None.
- Response body: String (`"Hello World!"`).
- Error cases: No custom cases.
- Example request:

```bash
curl -X GET http://localhost:3000/
```

- Example response:

```json
"Hello World!"
```

### GET `/users`

- Purpose: List all users with safe fields.
- Auth requirements: None.
- Params: None.
- Query: None.
- Request body: None.
- Response body: Array of users:
  - `id`, `email`, `name`, `role`, `createdAt`, `updatedAt`
- Error cases: No custom controller/service errors.
- Example request:

```bash
curl -X GET http://localhost:3000/users
```

- Example response:

```json
[
  {
    "id": "clx...",
    "email": "admin@tennjor.com",
    "name": "Admin",
    "role": "ADMIN",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z"
  }
]
```

### POST `/auth/login`

- Purpose: Authenticate user and issue JWT.
- Auth requirements: None.
- Params: None.
- Query: None.
- Request body:
  - `email: string (email)`
  - `password: string (min 6)`
- Response body:
  - `accessToken: string`
  - `user: { id, email, name, role }`
- Error cases:
  - `400` validation error (bad email/password shape)
  - `401` invalid credentials
- Example request:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@tennjor.com","password":"secret123"}'
```

- Example response:

```json
{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "id": "clx...",
    "email": "admin@tennjor.com",
    "name": "Admin",
    "role": "ADMIN"
  }
}
```

### GET `/catalog/categories`

- Purpose: Public category list for storefront filtering.
- Auth requirements: None.
- Params: None.
- Query: None.
- Request body: None.
- Response body: Array of categories (`Category` model fields only).
  - Includes active categories that have active products.
  - Additional service rule: only categories with at least 3 active products are returned.
- Error cases: None custom.
- Example request:

```bash
curl -X GET http://localhost:3000/catalog/categories
```

- Example response:

```json
[
  {
    "id": "cat_1",
    "name": "Tênis",
    "slug": "tenis",
    "isActive": true,
    "imageMobileUrl": "https://cdn.example.com/cat-mobile.jpg",
    "imageWebUrl": "https://cdn.example.com/cat-web.jpg",
    "createdAt": "2026-03-01T10:00:00.000Z",
    "updatedAt": "2026-03-05T10:00:00.000Z"
  }
]
```

### GET `/catalog/products`

- Purpose: Public product list.
- Auth requirements: None.
- Params: None.
- Query:
  - `category?: string` (category slug)
- Request body: None.
- Response body: Array of active products with relations:
  - product fields
  - `category`
  - `images` ordered by `order ASC`
  - `variants` filtered to `isActive=true`
  - does **not** include internal cost fields (`baseCost`, `costCurrency`)
- Error cases: None custom.
- Example request:

```bash
curl -X GET 'http://localhost:3000/catalog/products?category=tenis'
```

- Example response:

```json
[
  {
    "id": "prod_1",
    "name": "Tênis Alpha",
    "slug": "tenis-alpha",
    "description": "...",
    "isActive": true,
    "categoryId": "cat_1",
    "createdAt": "2026-03-01T10:00:00.000Z",
    "updatedAt": "2026-03-05T10:00:00.000Z",
    "category": {
      "id": "cat_1",
      "name": "Tênis",
      "slug": "tenis",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "...",
      "imageMobileUrl": null,
      "imageWebUrl": null
    },
    "images": [
      {
        "id": "img_1",
        "url": "https://...",
        "secureUrl": null,
        "publicId": null,
        "alt": "Front",
        "order": 0,
        "productId": "prod_1",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "variants": [
      {
        "id": "var_1",
        "size": "42",
        "color": "Preto",
        "sku": "TEN-42-PR",
        "isActive": true,
        "stock": 8,
        "productId": "prod_1"
      }
    ]
  }
]
```

### GET `/catalog/products/:slug`

- Purpose: Public product detail by slug.
- Auth requirements: None.
- Params:
  - `slug: string`
- Query: None.
- Request body: None.
- Response body: Same shape as a single item from `/catalog/products`.
  - does **not** include internal cost fields (`baseCost`, `costCurrency`)
- Error cases:
  - `404` product missing or inactive (`"Product not found"`)
- Example request:

```bash
curl -X GET http://localhost:3000/catalog/products/tenis-alpha
```

- Example response:

```json
{
  "id": "prod_1",
  "name": "Tênis Alpha",
  "slug": "tenis-alpha",
  "description": "...",
  "isActive": true,
  "categoryId": "cat_1",
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-05T10:00:00.000Z",
  "category": {
    "id": "cat_1",
    "name": "Tênis",
    "slug": "tenis",
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "...",
    "imageMobileUrl": null,
    "imageWebUrl": null
  },
  "images": [],
  "variants": []
}
```

### POST `/quote-requests`

- Purpose: Submit a quote request from storefront.
- Auth requirements: None.
- Params: None.
- Query: None.
- Request body:
  - `customerName: string` (required)
  - `customerEmail?: string` (email)
  - `customerPhone: string` (required)
  - `customerCity?: string`
  - `notes?: string`
  - `items: CreateQuoteRequestItemDto[]` (min 1)
  - Each item: `productId`, `size`, `color`, `quantity?` (int >=1, defaults to 1)
- Response body:
  - `{ message, data }`
  - `data` is created `QuoteRequest` including `items`
- Internal snapshot behavior:
  - each `QuoteRequestItem` stores internal snapshot fields at creation:
    - `baseCostSnapshot` from `Product.baseCost`
    - `costCurrencySnapshot` from `Product.costCurrency`
  - these internal cost snapshots are not exposed in the public create response payload
- Error cases:
  - `400` DTO validation failure
  - `400` invalid product IDs (`"One or more products are invalid."`)
- Example request:

```bash
curl -X POST http://localhost:3000/quote-requests \
  -H 'Content-Type: application/json' \
  -d '{
    "customerName":"Diego",
    "customerEmail":"diego@example.com",
    "customerPhone":"+1555123456",
    "customerCity":"Vancouver",
    "notes":"Need delivery estimate",
    "items":[
      {"productId":"prod_1","size":"42","color":"Preto","quantity":2}
    ]
  }'
```

- Example response:

```json
{
  "message": "Quote request created successfully.",
  "data": {
    "id": "qr_1",
    "customerName": "Diego",
    "customerEmail": "diego@example.com",
    "customerPhone": "+1555123456",
    "customerCity": "Vancouver",
    "notes": "Need delivery estimate",
    "internalNotes": [],
    "status": "NEW",
    "source": "WEB_FORM",
    "createdAt": "2026-03-07T20:00:00.000Z",
    "updatedAt": "2026-03-07T20:00:00.000Z",
    "items": [
      {
        "id": "qri_1",
        "quoteRequestId": "qr_1",
        "productId": "prod_1",
        "productNameSnapshot": "Tênis Alpha",
        "productSlugSnapshot": "tenis-alpha",
        "size": "42",
        "color": "Preto",
        "quantity": 2,
        "createdAt": "2026-03-07T20:00:00.000Z"
      }
    ]
  }
}
```

- Purpose: Admin dashboard aggregate metrics.
- Auth requirements: JWT required (no explicit ADMIN role guard on this JSON endpoint).
- Params: None.
- Query: None.
- Request body: None.
- Response body:
  - `{ data: { summary, quotesByStatus, topRequestedProducts } }`
  - `summary`: `totalQuotes`, `newQuotes`, `quotesThisWeek`
  - `quotesByStatus`: enum-keyed counts
  - `topRequestedProducts`: top 5 by requested quantity
- Error cases:
  - `401` missing/invalid token
- Example request:

```bash
curl -X GET http://localhost:3000/admin/dashboard/stats \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "data": {
    "summary": { "totalQuotes": 120, "newQuotes": 35, "quotesThisWeek": 12 },
    "quotesByStatus": {
      "NEW": 35,
      "CONTACTED": 30,
      "QUOTED": 28,
      "CLOSED": 20,
      "REJECTED": 7
    },
    "topRequestedProducts": [
      {
        "productId": "prod_1",
        "productName": "Tênis Alpha",
        "productSlug": "tenis-alpha",
        "totalRequestedQuantity": 45,
        "totalQuoteLines": 18
      }
    ]
  }
}
```

### GET `/admin/dashboard/stats/export/csv`

- Purpose: Export dashboard KPIs and quote request records in one CSV file (multiple sections).
- Auth requirements: JWT + ADMIN role required.
- Params: None.
- Query: None.
- Request body: None.
- Response body:
  - Raw CSV (`text/csv`) with clear sections:
  - `summary` (`totalQuotes`, `newQuotes`, `quotesThisWeek`)
  - `quotesByStatus` (status counts)
  - `topRequestedProducts` (top 5 by quantity)
  - `quoteRequests` (quote requests snapshot rows)
- Headers:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="dashboard-stats.csv"`
- Error cases:
  - `401` missing/invalid token
  - `403` authenticated but non-admin user
- Example request:

```bash
curl -X GET http://localhost:3000/admin/dashboard/stats/export/csv \
  -H 'Authorization: Bearer <admin-token>'
```

- Example response (excerpt):

```csv
section,metric,value
summary,totalQuotes,120
summary,newQuotes,35
summary,quotesThisWeek,12

# ----

section,status,count
quotesByStatus,NEW,35
quotesByStatus,CONTACTED,30

# ----

section,productId,productName,productSlug,totalRequestedQuantity,totalQuoteLines
topRequestedProducts,prod_1,Tênis Alpha,tenis-alpha,45,18

# ----

section,id,customerName,customerEmail,customerPhone,customerCity,status,source,itemsCount,totalRequestedQuantity,notes,internalNotes,createdAt,updatedAt
quoteRequests,qr_1,Diego,diego@example.com,+1555123456,Vancouver,NEW,WEB_FORM,2,3,Need delivery estimate,,2026-03-07T20:00:00.000Z,2026-03-07T20:00:00.000Z
```

### POST `/admin/sales-quotes`

- Purpose: Create an internal sales quote in `DRAFT` status.
- Auth requirements: JWT + ADMIN role required.
- Request body:
  - `customerName` (required)
  - `customerPhone?`, `customerEmail?`, `customerCity?`, `notes?`
  - `currency?` (3-letter uppercase code, default `MXN`)
  - `publicQuoteRequestId?` (optional link to public quote request)
- Behavior:
  - `createdByUserId` is taken from authenticated user.
  - quote code is generated server-side (format `SQ-<year>-<6-digit-seq>`).
  - totals start at zero.
- Response body:
  - `{ message: "Internal sale quote created successfully.", data: QuoteHeader }`

### GET `/admin/sales-quotes`

- Purpose: List internal sales quotes.
- Auth requirements: JWT + ADMIN role required.
- Query:
  - `status?` (`DRAFT|SENT|APPROVED|REJECTED|EXPIRED|COMPLETED`)
  - `search?` (matches `code` or `customerName`, case-insensitive)
  - `page?`, `limit?`
- Response body:
  - `{ data: QuoteSummary[], meta: { total, page, limit, totalPages } }`

### GET `/admin/sales-quotes/:id`

- Purpose: Fetch quote header + items + linked summaries.
- Auth requirements: JWT + ADMIN role required.
- Response body:
  - `{ data: QuoteDetail }` including:
  - quote items snapshots
  - `internalNotes` ordered by `createdAt ASC`
  - each note includes `id`, `message`, `createdAt`, and `author` summary (`id`, `name`, `email`, `role`)
  - optional `publicQuoteRequest` summary
  - `createdBy` summary
- Error cases:
  - `404` internal sale quote not found

### PATCH `/admin/sales-quotes/:id`

- Purpose: Update quote-level editable fields while quote is editable (`DRAFT`).
- Auth requirements: JWT + ADMIN role required.
- Editable fields:
  - `customerName?`, `customerPhone?`, `customerEmail?`, `customerCity?`, `notes?`
  - `currency?`
  - `discountTotal?` (`>= 0`)
- Behavior:
  - rejects non-`DRAFT` quotes for edits
  - recalculates totals after update
- Response body:
  - `{ data: QuoteDetail }`

### POST `/admin/sales-quotes/:id/items`

- Purpose: Add item snapshot to quote.
- Auth requirements: JWT + ADMIN role required.
- Request body:
  - `productId` (required)
  - `variantId?` (must belong to product when provided)
  - `quantity` (`> 0`)
  - `unitSalePrice` (`>= 0`)
  - `unitCostSnapshot?` (`>= 0`, defaults to `product.baseCost` or `0`)
  - `discountType?` (`FIXED|PERCENTAGE`)
  - `discountValue?` (`>= 0`, requires `discountType`)
  - `sortOrder?` (`>= 0`)
- Behavior:
  - snapshots product/variant fields into quote item
  - computes `lineRevenue`, `lineCost`, `lineProfit`
  - recalculates quote totals
- Response body:
  - `{ message: "Quote item added successfully.", data: { item, quoteTotals } }`

### PATCH `/admin/sales-quotes/:id/items/:itemId`

- Purpose: Update quote item values and recompute.
- Auth requirements: JWT + ADMIN role required.
- Editable fields:
  - `quantity?`, `unitSalePrice?`, `unitCostSnapshot?`
  - `discountType?`, `discountValue?`, `sortOrder?`
- Behavior:
  - validates discount pair consistency
  - recalculates item line totals
  - recalculates quote totals
- Response body:
  - `{ message: "Quote item updated successfully.", data: { item, quoteTotals } }`

### DELETE `/admin/sales-quotes/:id/items/:itemId`

- Purpose: Delete quote item and recalculate quote totals.
- Auth requirements: JWT + ADMIN role required.
- Response body:
  - `{ message: "Quote item deleted successfully.", data: { id, quoteTotals } }`

### POST `/admin/sales-quotes/:id/recalculate`

- Purpose: Force full server-side recalculation from current item snapshots.
- Auth requirements: JWT + ADMIN role required.
- Behavior:
  - recomputes each item line totals
  - recomputes quote header totals (`subtotal`, `totalRevenue`, `totalCost`, `totalProfit`, `marginPct`)
- Response body:
  - `{ message: "Quote totals recalculated successfully.", data: QuoteTotals }`

### POST `/admin/sales-quotes/:id/internal-notes`

- Purpose: Create a timestamped internal collaboration note on a sales quote.
- Auth requirements: JWT + ADMIN role required.
- Params:
  - `id` (internal sales quote id)
- Request body:
  - `message` (string, required, trimmed, must contain non-whitespace characters)
- Behavior:
  - validates quote exists
  - sets note author from authenticated user (`authorUserId`)
  - stores note in `InternalSaleQuoteNote`
- Response body:
  - `{ message: "Internal quote note added successfully.", data: Note }`
  - `Note` includes:
    - `id`, `message`, `createdAt`
    - `author` summary (`id`, `name`, `email`, `role`)
- Error cases:
  - `400` invalid/empty message
  - `404` quote not found
- Example request:

```bash
curl -X POST http://localhost:3000/admin/sales-quotes/quote_1/internal-notes \
  -H 'Authorization: Bearer <admin-token>' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Client requested 30-day payment terms."}'
```

- Example response:

```json
{
  "message": "Internal quote note added successfully.",
  "data": {
    "id": "note_1",
    "message": "Client requested 30-day payment terms.",
    "createdAt": "2026-03-09T20:30:00.000Z",
    "author": {
      "id": "user_admin",
      "name": "Admin",
      "email": "admin@tennjor.com",
      "role": "ADMIN"
    }
  }
}
```

### POST `/admin/sales-quotes/:id/complete-sale`

- Purpose: Convert an internal quote into a finalized `CompletedSale` snapshot.
- Auth requirements: JWT + ADMIN role required.
- Request body: none.
- Transaction behavior:
  - loads quote + items
  - validates eligibility
  - generates sale number (`S-<year>-<6-digit-seq>`)
  - creates `CompletedSale`
  - copies `InternalSaleQuoteItem` snapshots into `CompletedSaleItem`
  - updates quote status to `COMPLETED` and sets `quote.completedAt`
  - if quote is linked to a public quote request, updates that quote request status to `CLOSED`
  - commits as a single DB transaction
- Validation rules:
  - quote must exist
  - quote must have at least one item
  - quote must not be already completed or already linked to a completed sale
  - allowed completion source statuses: `DRAFT`, `SENT`, `APPROVED`
  - quote snapshot monetary fields are copied as-is into sale (no live catalog recalculation)
- Response body:
  - `{ message: "Quote completed into sale successfully.", data: { sale, quote } }`
  - `sale` includes: `id`, `saleNumber`, `status`, `subtotal`, `discountTotal`, `totalRevenue`, `totalCost`, `totalProfit`, `marginPct`, `completedAt`
  - `quote` includes updated status and completion timestamp
- Error cases:
  - `400` invalid completion state / no items
  - `404` quote not found
- Example request:

```bash
curl -X POST http://localhost:3000/admin/sales-quotes/quote_id/complete-sale \
  -H 'Authorization: Bearer <admin-token>'
```

- Example response:

```json
{
  "message": "Quote completed into sale successfully.",
  "data": {
    "sale": {
      "id": "sale_1",
      "saleNumber": "S-2026-000001",
      "status": "COMPLETED",
      "subtotal": "14500.00",
      "discountTotal": "500.00",
      "totalRevenue": "14000.00",
      "totalCost": "9100.00",
      "totalProfit": "4900.00",
      "marginPct": "35.0000",
      "completedAt": "2026-03-09T10:00:00.000Z",
      "createdAt": "2026-03-09T10:00:00.000Z"
    },
    "quote": {
      "id": "quote_1",
      "code": "SQ-2026-000001",
      "status": "COMPLETED",
      "completedAt": "2026-03-09T10:00:00.000Z",
      "updatedAt": "2026-03-09T10:00:00.000Z"
    }
  }
}
```

### GET `/admin/sales`

- Purpose: List completed sales with pagination, filters, and sorting.
- Auth requirements: JWT + ADMIN role required.
- Query:
  - `page?` (`>= 1`, default `1`)
  - `limit?` (`>= 1`, default `10`)
  - `status?` (`COMPLETED|CANCELLED|REFUNDED`)
  - `customerName?` (contains, case-insensitive)
  - `saleNumber?` (contains, case-insensitive)
  - `dateFrom?` (ISO date string)
  - `dateTo?` (ISO date string)
  - `sortBy?` (`completedAt|createdAt|totalRevenue|totalProfit`, default `completedAt`)
  - `sortOrder?` (`asc|desc`, default `desc`)
- Behavior:
  - reads from `CompletedSale` only
  - validates `dateFrom <= dateTo`
- Response body:
  - `{ data: CompletedSaleSummary[], meta: { total, page, limit, totalPages } }`
  - summary row fields:
    - `id`, `saleNumber`, `status`
    - `customerName`, `customerPhone`, `customerEmail`
    - `currency`, `totalRevenue`, `totalCost`, `totalProfit`, `marginPct`
    - `completedAt`, `createdAt`, `quoteId`
- Error cases:
  - `400` invalid pagination/filter/sort params or invalid date range
  - `401` missing/invalid token
  - `403` authenticated but non-admin user
- Example request:

```bash
curl -X GET 'http://localhost:3000/admin/sales?page=1&limit=10&status=COMPLETED&sortBy=completedAt&sortOrder=desc' \
  -H 'Authorization: Bearer <admin-token>'
```

- Example response:

```json
{
  "data": [
    {
      "id": "sale_1",
      "saleNumber": "S-2026-000001",
      "status": "COMPLETED",
      "customerName": "Zapaterias del Norte",
      "customerPhone": "+525512345678",
      "customerEmail": "compras@zapnorte.mx",
      "currency": "MXN",
      "totalRevenue": "14000.00",
      "totalCost": "9100.00",
      "totalProfit": "4900.00",
      "marginPct": "35.0000",
      "completedAt": "2026-03-09T10:00:00.000Z",
      "createdAt": "2026-03-09T10:00:00.000Z",
      "quoteId": "quote_1"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET `/admin/sales/stats`

- Purpose: Aggregated completed-sales metrics for month/year/custom periods.
- Auth requirements: JWT + ADMIN role required.
- Query:
  - `period?` (`month|year|custom`, default `month`)
  - `year?` (4-digit year; used by `month`/`year`)
  - `month?` (`1..12`; optional for `period=month`, defaults to current month when omitted)
  - `dateFrom?` (ISO date string; required when `period=custom`)
  - `dateTo?` (ISO date string; required when `period=custom`)
  - `status?` (`COMPLETED|CANCELLED|REFUNDED`, optional filter)
- Behavior:
  - computes stats from `CompletedSale` and `CompletedSaleItem` only
  - date filtering uses `completedAt`
  - `period=custom` validates `dateFrom <= dateTo`
- Response body:
  - `{ data: { period, dateFrom, dateTo, salesCount, totalRevenue, totalCost, totalProfit, averageMarginPct, averageTicket, salesByStatus, topSellingProducts, topProfitableProducts } }`
  - `salesByStatus`: count map by completed sale status
  - `topSellingProducts`: top 5 by total quantity sold in the range
  - `topProfitableProducts`: top 5 by line profit in the range
- Error cases:
  - `400` invalid period/date params or invalid custom range
  - `401` missing/invalid token
  - `403` authenticated but non-admin user
- Example request:

```bash
curl -X GET 'http://localhost:3000/admin/sales/stats?period=month&year=2026&month=3' \
  -H 'Authorization: Bearer <admin-token>'
```

- Example response:

```json
{
  "data": {
    "period": "month",
    "dateFrom": "2026-03-01T00:00:00.000Z",
    "dateTo": "2026-03-31T23:59:59.999Z",
    "salesCount": 14,
    "totalRevenue": 125400,
    "totalCost": 88700,
    "totalProfit": 36700,
    "averageMarginPct": 29.7842,
    "averageTicket": 8957.142857142857,
    "salesByStatus": {
      "COMPLETED": 13,
      "CANCELLED": 1,
      "REFUNDED": 0
    },
    "topSellingProducts": [
      {
        "productId": "prod_1",
        "productName": "Tenis Alpha",
        "productSlug": "tenis-alpha",
        "totalQuantity": 120,
        "totalRevenue": 84000,
        "totalProfit": 22800
      }
    ],
    "topProfitableProducts": [
      {
        "productId": "prod_1",
        "productName": "Tenis Alpha",
        "productSlug": "tenis-alpha",
        "totalQuantity": 120,
        "totalRevenue": 84000,
        "totalProfit": 22800
      }
    ]
  }
}
```

### GET `/admin/sales/export/csv`

- Purpose: Export completed sales rows to CSV for admin reporting.
- Auth requirements: JWT + ADMIN role required.
- Query:
  - same filters/sorting as `GET /admin/sales`
  - `status?`, `customerName?`, `saleNumber?`, `dateFrom?`, `dateTo?`
  - `sortBy?` (`completedAt|createdAt|totalRevenue|totalProfit`)
  - `sortOrder?` (`asc|desc`)
- Response body:
  - Raw CSV (`text/csv`) with columns:
  - `saleNumber,status,customerName,customerPhone,customerEmail,currency,subtotal,discountTotal,totalRevenue,totalCost,totalProfit,marginPct,completedAt,createdAt`
- Headers:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="sales.csv"`
- Error cases:
  - `400` invalid query/date range
  - `401` missing/invalid token
  - `403` authenticated but non-admin user
- Example request:

```bash
curl -X GET 'http://localhost:3000/admin/sales/export/csv?status=COMPLETED&dateFrom=2026-03-01&dateTo=2026-03-31' \
  -H 'Authorization: Bearer <admin-token>'
```

- Example response (excerpt):

```csv
saleNumber,status,customerName,customerPhone,customerEmail,currency,subtotal,discountTotal,totalRevenue,totalCost,totalProfit,marginPct,completedAt,createdAt
S-2026-000001,COMPLETED,Zapaterias del Norte,+525512345678,compras@zapnorte.mx,MXN,14500.00,500.00,14000.00,9100.00,4900.00,35.0000,2026-03-09T10:00:00.000Z,2026-03-09T10:00:00.000Z
```

### GET `/admin/sales/:id`

- Purpose: Get completed sale detail with item snapshots.
- Auth requirements: JWT + ADMIN role required.
- Params:
  - `id` (completed sale id)
- Response body:
  - `{ data: CompletedSaleDetail }` with:
    - sale header totals/customer/notes/status/timestamps
    - optional `quote` summary (`id`, `code`, `status`, `createdAt`)
    - `createdBy` summary (`id`, `name`, `email`, `role`)
    - `items[]` snapshot lines with:
      - `id`, `productId`, `variantId`
      - `productNameSnapshot`, `productSlugSnapshot`
      - `sizeSnapshot`, `colorSnapshot`, `skuSnapshot`
      - `quantity`, `unitSalePrice`, `unitCostSnapshot`
      - `lineRevenue`, `lineCost`, `lineProfit`
      - `discountType`, `discountValue`, `createdAt`
- Error cases:
  - `404` completed sale not found
  - `401` missing/invalid token
  - `403` authenticated but non-admin user
- Example request:

```bash
curl -X GET http://localhost:3000/admin/sales/sale_1 \
  -H 'Authorization: Bearer <admin-token>'
```

- Example response:

```json
{
  "data": {
    "id": "sale_1",
    "saleNumber": "S-2026-000001",
    "status": "COMPLETED",
    "customerName": "Zapaterias del Norte",
    "customerPhone": "+525512345678",
    "customerEmail": "compras@zapnorte.mx",
    "customerCity": "Monterrey",
    "currency": "MXN",
    "subtotal": "14500.00",
    "discountTotal": "500.00",
    "totalRevenue": "14000.00",
    "totalCost": "9100.00",
    "totalProfit": "4900.00",
    "marginPct": "35.0000",
    "notes": "Entrega parcial en 72h",
    "completedAt": "2026-03-09T10:00:00.000Z",
    "createdAt": "2026-03-09T10:00:00.000Z",
    "updatedAt": "2026-03-09T10:00:00.000Z",
    "quote": {
      "id": "quote_1",
      "code": "SQ-2026-000001",
      "status": "COMPLETED",
      "createdAt": "2026-03-09T09:20:00.000Z"
    },
    "createdBy": {
      "id": "user_admin",
      "name": "Admin",
      "email": "admin@tennjor.com",
      "role": "ADMIN"
    },
    "items": [
      {
        "id": "sale_item_1",
        "productId": "prod_1",
        "variantId": "var_1",
        "productNameSnapshot": "Tenis Alpha",
        "productSlugSnapshot": "tenis-alpha",
        "sizeSnapshot": "26",
        "colorSnapshot": "Negro",
        "skuSnapshot": "ALPHA-26-BLK",
        "quantity": 20,
        "unitSalePrice": "700.00",
        "unitCostSnapshot": "455.00",
        "lineRevenue": "14000.00",
        "lineCost": "9100.00",
        "lineProfit": "4900.00",
        "discountType": null,
        "discountValue": null,
        "createdAt": "2026-03-09T10:00:00.000Z"
      }
    ]
  }
}
```

### GET `/admin/products`

- Purpose: Admin product list with pagination/filters.
- Auth requirements: JWT required.
- Params: None.
- Query:
  - `search?: string`
  - `categoryId?: string`
  - `page?: number >= 1` (default `1`)
  - `limit?: number >= 1` (default `10`)
  - `isActive?: boolean`
- Request body: None.
- Response body:
  - `{ data: ProductAdmin[], meta: { total, page, limit, totalPages } }`
  - includes internal fields: `baseCost` (nullable decimal) and `costCurrency` (3-letter currency code)
- Error cases:
  - `401` auth
  - `400` validation for query types/ranges
- Example request:

```bash
curl -X GET 'http://localhost:3000/admin/products?page=1&limit=10&isActive=true' \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "data": [
    {
      "id": "prod_1",
      "name": "Tênis Alpha",
      "slug": "tenis-alpha",
      "description": "...",
      "isActive": true,
      "baseCost": "350.00",
      "costCurrency": "MXN",
      "createdAt": "...",
      "updatedAt": "...",
      "category": { "id": "cat_1", "name": "Tênis", "slug": "tenis" },
      "images": [
        {
          "id": "img_1",
          "url": "https://...",
          "secureUrl": null,
          "publicId": null,
          "alt": "Front",
          "order": 0
        }
      ],
      "variants": [
        {
          "id": "var_1",
          "size": "42",
          "color": "Preto",
          "sku": "TEN-42-PR",
          "isActive": true,
          "stock": 8
        }
      ]
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 }
}
```

### GET `/admin/products/export/csv`

- Purpose: Export admin products using same filters as admin product list.
- Auth requirements: JWT + ADMIN role required.
- Params: None.
- Query:
  - `search?: string`
  - `categoryId?: string`
  - `isActive?: boolean`
- Request body: None.
- Response body:
  - Raw CSV (`text/csv`) with columns:
  - `id,name,slug,description,isActive,categoryId,categoryName,imagesCount,variantsCount,totalStock,createdAt,updatedAt`
- Headers:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="products.csv"`
- Error cases:
  - `401` missing/invalid token
  - `403` authenticated but non-admin user
  - `400` invalid query values (same DTO validation as list endpoint)
- Example request:

```bash
curl -X GET 'http://localhost:3000/admin/products/export/csv?search=alpha&isActive=true' \
  -H 'Authorization: Bearer <admin-token>'
```

- Example response (excerpt):

```csv
id,name,slug,description,isActive,categoryId,categoryName,imagesCount,variantsCount,totalStock,createdAt,updatedAt
prod_1,Tênis Alpha,tenis-alpha,Caminhada,true,cat_1,Tênis,2,3,18,2026-03-01T10:00:00.000Z,2026-03-05T10:00:00.000Z
```

### GET `/admin/products/:id`

- Purpose: Admin product detail.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: None.
- Response body: `{ data: ProductAdminDetail }`.
  - includes internal fields: `baseCost` and `costCurrency`
- Error cases:
  - `401` auth
  - `404` product not found
- Example request:

```bash
curl -X GET http://localhost:3000/admin/products/prod_1 \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "data": {
    "id": "prod_1",
    "name": "Tênis Alpha",
    "slug": "tenis-alpha",
    "description": "...",
    "isActive": true,
    "baseCost": "350.00",
    "costCurrency": "MXN",
    "createdAt": "...",
    "updatedAt": "...",
    "category": { "id": "cat_1", "name": "Tênis", "slug": "tenis" },
    "images": [
      {
        "id": "img_1",
        "url": "https://...",
        "secureUrl": null,
        "publicId": null,
        "alt": "Front",
        "order": 0,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "variants": [
      {
        "id": "var_1",
        "size": "42",
        "color": "Preto",
        "sku": "TEN-42-PR",
        "isActive": true,
        "stock": 8
      }
    ]
  }
}
```

### POST `/admin/products`

- Purpose: Create product with optional initial images/variants.
- Auth requirements: JWT required.
- Params: None.
- Query: None.
- Request body:
  - `name`, `slug`, `categoryId` required
  - optional: `description`, `isActive`
  - optional: `baseCost` (number, `>= 0`, max 2 decimals), `costCurrency` (string, 3 uppercase letters like `MXN`)
  - optional `images[]` and `variants[]` nested DTO arrays
- Response body:
  - `{ message: "Product created successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `400` invalid DTO fields
  - `400` category not found
  - `400` slug already exists
- Example request:

```bash
curl -X POST http://localhost:3000/admin/products \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Tênis Alpha",
    "slug":"tenis-alpha",
    "description":"Caminhada",
    "categoryId":"cat_1",
    "baseCost":350,
    "costCurrency":"MXN",
    "images":[{"url":"https://cdn.example.com/alpha-1.jpg","alt":"Front","order":0}],
    "variants":[{"size":"42","color":"Preto","sku":"TEN-42-PR","stock":8}]
  }'
```

- Example response:

```json
{
  "message": "Product created successfully.",
  "data": {
    "id": "prod_1",
    "name": "Tênis Alpha",
    "slug": "tenis-alpha",
    "description": "Caminhada",
    "isActive": true,
    "baseCost": "350.00",
    "costCurrency": "MXN",
    "createdAt": "...",
    "updatedAt": "...",
    "category": { "id": "cat_1", "name": "Tênis", "slug": "tenis" },
    "images": [
      {
        "id": "img_1",
        "url": "https://cdn.example.com/alpha-1.jpg",
        "alt": "Front",
        "order": 0
      }
    ],
    "variants": [
      {
        "id": "var_1",
        "size": "42",
        "color": "Preto",
        "sku": "TEN-42-PR",
        "isActive": true,
        "stock": 8
      }
    ]
  }
}
```

### PATCH `/admin/products/:id`

- Purpose: Update product fields.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: any subset of
  - `name`, `slug`, `description`, `isActive`, `categoryId`, `baseCost`, `costCurrency`
- Response body:
  - `{ message: "Product updated successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `404` product not found
  - `400` category not found
  - `400` slug already exists
  - `400` invalid cost values (`baseCost < 0`, more than 2 decimals, or invalid `costCurrency` format)
- Example request:

```bash
curl -X PATCH http://localhost:3000/admin/products/prod_1 \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"isActive":false}'
```

- Example response:

```json
{
  "message": "Product updated successfully.",
  "data": {
    "id": "prod_1",
    "name": "Tênis Alpha",
    "slug": "tenis-alpha",
    "description": "Caminhada",
    "isActive": false,
    "baseCost": "350.00",
    "costCurrency": "MXN",
    "createdAt": "...",
    "updatedAt": "...",
    "category": { "id": "cat_1", "name": "Tênis", "slug": "tenis" },
    "images": [],
    "variants": []
  }
}
```

### DELETE `/admin/products/:id`

- Purpose: Delete a product and explicitly clean related variants/images in a transaction.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: None.
- Response body:
  - `{ message: "Product deleted successfully.", data: { id, deletedVariants, deletedImages, cloudinaryCleanupPendingPublicIds } }`
- Error cases:
  - `401` auth
  - `404` product not found
  - `400` product has quote-request references and cannot be deleted
- Notes:
  - Service uses explicit transactional cleanup (`variants`, `images`, then `product`).
  - `cloudinaryCleanupPendingPublicIds` is returned as a hook for future Cloudinary physical asset deletion.
- Example request:

```bash
curl -X DELETE http://localhost:3000/admin/products/prod_1 \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "message": "Product deleted successfully.",
  "data": {
    "id": "prod_1",
    "deletedVariants": true,
    "deletedImages": true,
    "cloudinaryCleanupPendingPublicIds": ["catalog/prod_1/front"]
  }
}
```

### POST `/admin/products/:productId/variants`

- Purpose: Add variant to product.
- Auth requirements: JWT required.
- Params: `productId`.
- Query: None.
- Request body:
  - `size`, `color` required
  - optional `sku`, `isActive`, `stock` (`stock` int >= 0)
- Response body:
  - `{ message: "Product variant created successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `404` product not found
  - `400` SKU already exists
- Example request:

```bash
curl -X POST http://localhost:3000/admin/products/prod_1/variants \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"size":"43","color":"Branco","sku":"TEN-43-BR","stock":5}'
```

- Example response:

```json
{
  "message": "Product variant created successfully.",
  "data": {
    "id": "var_2",
    "size": "43",
    "color": "Branco",
    "sku": "TEN-43-BR",
    "isActive": true,
    "stock": 5,
    "productId": "prod_1"
  }
}
```

### POST `/admin/products/:productId/variants/bulk`

- Purpose: Bulk create variants by shoe-size range for a single product.
- Auth requirements: JWT required.
- Params: `productId`.
- Query: None.
- Request body:
  - `startSize: number` (whole or `.5`)
  - `endSize: number` (whole or `.5`)
  - `includeHalfSizes: boolean`
  - `color: string`
  - `stock?: number` (int >= 0)
  - `isActive?: boolean`
- Behavior:
  - Sizes are generated in ascending order.
  - `includeHalfSizes=false` => increments by `1` only.
  - `includeHalfSizes=true` => increments by `0.5`.
  - Rejects invalid ranges (`startSize > endSize`).
  - Rejects invalid step values (must be whole or half sizes).
  - Prevents duplicate variants for the same product + color + size by skipping existing ones.
  - SKU is not auto-generated; created records keep `sku: null` unless set later via update endpoint.
- Response body:
  - `{ message, data: { productId, requestedCount, createdCount, skippedCount, skippedSizes, variants } }`
- Error cases:
  - `401` auth
  - `404` product not found
  - `400` invalid range or invalid size step
- Example request:

```bash
curl -X POST http://localhost:3000/admin/products/prod_1/variants/bulk \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "startSize": 22,
    "endSize": 24,
    "includeHalfSizes": true,
    "color": "Negro",
    "stock": 10,
    "isActive": true
  }'
```

- Example response:

```json
{
  "message": "Product variants bulk creation completed successfully.",
  "data": {
    "productId": "prod_1",
    "requestedCount": 5,
    "createdCount": 4,
    "skippedCount": 1,
    "skippedSizes": ["23"],
    "variants": [
      {
        "id": "var_10",
        "size": "22",
        "color": "Negro",
        "sku": null,
        "isActive": true,
        "stock": 10,
        "productId": "prod_1"
      }
    ]
  }
}
```

### PATCH `/admin/variants/:id`

- Purpose: Update variant fields.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: any subset of
  - `size`, `color`, `sku`, `isActive`, `stock`
- Response body:
  - `{ message: "Product variant updated successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `404` variant not found
  - `400` SKU already exists
- Example request:

```bash
curl -X PATCH http://localhost:3000/admin/variants/var_2 \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"stock":0,"isActive":false}'
```

- Example response:

```json
{
  "message": "Product variant updated successfully.",
  "data": {
    "id": "var_2",
    "size": "43",
    "color": "Branco",
    "sku": "TEN-43-BR",
    "isActive": false,
    "stock": 0,
    "productId": "prod_1"
  }
}
```

### DELETE `/admin/variants/:id`

- Purpose: Delete a single product variant.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: None.
- Response body:
  - `{ message: "Product variant deleted successfully.", data: { id } }`
- Error cases:
  - `401` auth
  - `404` variant not found
- Example request:

```bash
curl -X DELETE http://localhost:3000/admin/variants/var_2 \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "message": "Product variant deleted successfully.",
  "data": {
    "id": "var_2"
  }
}
```

### POST `/admin/products/:productId/images`

- Purpose: Add product image.
- Auth requirements: JWT required.
- Params: `productId`.
- Query: None.
- Request body:
  - required `url` (valid URL)
  - optional `secureUrl`, `publicId`, `alt`, `order` (int >= 0)
- Response body:
  - `{ message: "Product image created successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `404` product not found
  - `400` validation error
- Example request:

```bash
curl -X POST http://localhost:3000/admin/products/prod_1/images \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://cdn.example.com/alpha-side.jpg","alt":"Side","order":1}'
```

- Example response:

```json
{
  "message": "Product image created successfully.",
  "data": {
    "id": "img_2",
    "url": "https://cdn.example.com/alpha-side.jpg",
    "secureUrl": null,
    "publicId": null,
    "alt": "Side",
    "order": 1,
    "productId": "prod_1",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### PATCH `/admin/product-images/:id`

- Purpose: Update image fields/order.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: any subset of
  - `url`, `secureUrl`, `publicId`, `alt`, `order`
- Response body:
  - `{ message: "Product image updated successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `404` image not found
  - `400` validation
- Example request:

```bash
curl -X PATCH http://localhost:3000/admin/product-images/img_2 \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"order":0}'
```

- Example response:

```json
{
  "message": "Product image updated successfully.",
  "data": {
    "id": "img_2",
    "url": "https://cdn.example.com/alpha-side.jpg",
    "secureUrl": null,
    "publicId": null,
    "alt": "Side",
    "order": 0,
    "productId": "prod_1",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### DELETE `/admin/product-images/:id`

- Purpose: Delete product image.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: None.
- Response body:
  - `{ message: "Product image deleted successfully.", data: { id, publicId } }`
- Error cases:
  - `401` auth
  - `404` image not found
- Example request:

```bash
curl -X DELETE http://localhost:3000/admin/product-images/img_2 \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "message": "Product image deleted successfully.",
  "data": {
    "id": "img_2",
    "publicId": null
  }
}
```

### GET `/admin/categories`

- Purpose: Admin category list with optional filters.
- Auth requirements: JWT required.
- Params: None.
- Query:
  - `search?: string`
  - `isActive?: boolean`
- Request body: None.
- Response body:
  - `{ data: CategoryAdmin[] }` with `_count.products`
- Error cases:
  - `401` auth
  - `400` query validation
- Example request:

```bash
curl -X GET 'http://localhost:3000/admin/categories?isActive=true' \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "data": [
    {
      "id": "cat_1",
      "name": "Tênis",
      "slug": "tenis",
      "isActive": true,
      "imageWebUrl": "https://cdn.example.com/cat-web.jpg",
      "imageMobileUrl": "https://cdn.example.com/cat-mobile.jpg",
      "createdAt": "...",
      "updatedAt": "...",
      "_count": { "products": 14 }
    }
  ]
}
```

### GET `/admin/categories/export/csv`

- Purpose: Export admin categories using same filters as admin category list.
- Auth requirements: JWT + ADMIN role required.
- Params: None.
- Query:
  - `search?: string`
  - `isActive?: boolean`
- Request body: None.
- Response body:
  - Raw CSV (`text/csv`) with columns:
  - `id,name,slug,isActive,imageWebUrl,imageMobileUrl,productsCount,createdAt,updatedAt`
- Headers:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="categories.csv"`
- Error cases:
  - `401` missing/invalid token
  - `403` authenticated but non-admin user
  - `400` invalid query values (same DTO validation as list endpoint)
- Example request:

```bash
curl -X GET 'http://localhost:3000/admin/categories/export/csv?isActive=true' \
  -H 'Authorization: Bearer <admin-token>'
```

- Example response (excerpt):

```csv
id,name,slug,isActive,imageWebUrl,imageMobileUrl,productsCount,createdAt,updatedAt
cat_1,Tênis,tenis,true,https://cdn.example.com/cat-web.jpg,https://cdn.example.com/cat-mobile.jpg,14,2026-03-01T10:00:00.000Z,2026-03-05T10:00:00.000Z
```

### GET `/admin/categories/:id`

- Purpose: Admin category detail with products snapshot.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: None.
- Response body:
  - `{ data: CategoryWithProducts }`
  - Each product includes only first image (`take:1`) and variants.
- Error cases:
  - `401` auth
  - `404` category not found
- Example request:

```bash
curl -X GET http://localhost:3000/admin/categories/cat_1 \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "data": {
    "id": "cat_1",
    "name": "Tênis",
    "slug": "tenis",
    "isActive": true,
    "imageWebUrl": "https://cdn.example.com/cat-web.jpg",
    "imageMobileUrl": "https://cdn.example.com/cat-mobile.jpg",
    "createdAt": "...",
    "updatedAt": "...",
    "products": [
      {
        "id": "prod_1",
        "name": "Tênis Alpha",
        "slug": "tenis-alpha",
        "isActive": true,
        "createdAt": "...",
        "images": [
          {
            "id": "img_1",
            "url": "https://...",
            "secureUrl": null,
            "alt": "Front",
            "order": 0
          }
        ],
        "variants": [
          {
            "id": "var_1",
            "size": "42",
            "color": "Preto",
            "stock": 8,
            "isActive": true
          }
        ]
      }
    ],
    "_count": { "products": 14 }
  }
}
```

### POST `/admin/categories`

- Purpose: Create category.
- Auth requirements: JWT required.
- Params: None.
- Query: None.
- Request body:
  - required: `name`, `slug`
  - optional: `isActive`, `imageWebUrl`, `imageMobileUrl`
- Response body:
  - `{ message: "Category created successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `400` slug exists
  - `400` validation (URL/boolean/etc.)
- Example request:

```bash
curl -X POST http://localhost:3000/admin/categories \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Tênis","slug":"tenis","imageWebUrl":"https://cdn.example.com/cat-web.jpg"}'
```

- Example response:

```json
{
  "message": "Category created successfully.",
  "data": {
    "id": "cat_1",
    "name": "Tênis",
    "slug": "tenis",
    "isActive": true,
    "imageWebUrl": "https://cdn.example.com/cat-web.jpg",
    "imageMobileUrl": null,
    "createdAt": "...",
    "updatedAt": "...",
    "_count": { "products": 0 }
  }
}
```

### PATCH `/admin/categories/:id`

- Purpose: Update category fields.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: any subset of
  - `name`, `slug`, `isActive`, `imageWebUrl`, `imageMobileUrl`
- Response body:
  - `{ message: "Category updated successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `404` category not found
  - `400` slug exists
- Example request:

```bash
curl -X PATCH http://localhost:3000/admin/categories/cat_1 \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"isActive":false}'
```

- Example response:

```json
{
  "message": "Category updated successfully.",
  "data": {
    "id": "cat_1",
    "name": "Tênis",
    "slug": "tenis",
    "isActive": false,
    "imageWebUrl": "https://cdn.example.com/cat-web.jpg",
    "imageMobileUrl": null,
    "createdAt": "...",
    "updatedAt": "...",
    "_count": { "products": 14 }
  }
}
```

### DELETE `/admin/categories/:id`

- Purpose: Delete category and nested catalog data (products, variants, images) in one transaction.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: None.
- Response body:
  - `{ message: "Category deleted successfully.", data: { id, deletedProductsCount, deletedVariants, deletedImages, cloudinaryCleanupPendingPublicIds } }`
- Error cases:
  - `401` auth
  - `404` category not found
  - `400` one or more products in the category are referenced by quote requests
- Notes:
  - Service uses explicit transactional cleanup.
  - Cloudinary assets are not physically removed yet; returned public IDs are a cleanup hook.
- Example request:

```bash
curl -X DELETE http://localhost:3000/admin/categories/cat_1 \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "message": "Category deleted successfully.",
  "data": {
    "id": "cat_1",
    "deletedProductsCount": 12,
    "deletedVariants": true,
    "deletedImages": true,
    "cloudinaryCleanupPendingPublicIds": ["catalog/prod_1/front"]
  }
}
```

### GET `/admin/quote-requests`

- Purpose: Admin quote request list with pagination/filter/search.
- Auth requirements: JWT required.
- Params: None.
- Query:
  - `status?: NEW|CONTACTED|QUOTED|CONVERTED|CLOSED|REJECTED`
  - `search?: string` (name/email/phone contains, insensitive)
  - `page?: number >=1` (default `1`)
  - `limit?: number >=1` (default `10`)
- Request body: None.
- Response body:
  - `{ data: QuoteRequestAdmin[], meta: { total, page, limit, totalPages } }`
  - each item includes internal snapshot fields:
    - `baseCostSnapshot`
    - `costCurrencySnapshot`
- Error cases:
  - `401` auth
  - `400` validation
- Example request:

```bash
curl -X GET 'http://localhost:3000/admin/quote-requests?status=NEW&page=1&limit=20' \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "data": [
    {
      "id": "qr_1",
      "customerName": "Diego",
      "customerEmail": "diego@example.com",
      "customerPhone": "+1555123456",
      "customerCity": "Vancouver",
      "notes": "Need delivery estimate",
      "internalNotes": [],
      "status": "NEW",
      "convertedAt": null,
      "source": "WEB_FORM",
      "createdAt": "...",
      "updatedAt": "...",
      "internalSaleQuote": null,
      "items": [
        {
          "id": "qri_1",
          "productId": "prod_1",
          "productNameSnapshot": "Tênis Alpha",
          "productSlugSnapshot": "tenis-alpha",
          "baseCostSnapshot": "350.00",
          "costCurrencySnapshot": "MXN",
          "size": "42",
          "color": "Preto",
          "quantity": 2
        }
      ]
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### GET `/admin/quote-requests/:id`

- Purpose: Admin quote request detail.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body: None.
- Response body:
  - `{ data: QuoteRequestAdminDetail }` (includes item `createdAt`)
  - each item includes internal snapshot fields:
    - `baseCostSnapshot`
    - `costCurrencySnapshot`
- Error cases:
  - `401` auth
  - `404` quote request not found
- Example request:

```bash
curl -X GET http://localhost:3000/admin/quote-requests/qr_1 \
  -H 'Authorization: Bearer <token>'
```

- Example response:

```json
{
  "data": {
    "id": "qr_1",
    "customerName": "Diego",
    "customerEmail": "diego@example.com",
    "customerPhone": "+1555123456",
    "customerCity": "Vancouver",
    "notes": "Need delivery estimate",
    "internalNotes": [],
    "status": "NEW",
    "convertedAt": null,
    "source": "WEB_FORM",
    "createdAt": "...",
    "updatedAt": "...",
    "internalSaleQuote": null,
    "items": [
      {
        "id": "qri_1",
        "productId": "prod_1",
        "productNameSnapshot": "Tênis Alpha",
        "productSlugSnapshot": "tenis-alpha",
        "baseCostSnapshot": "350.00",
        "costCurrencySnapshot": "MXN",
        "size": "42",
        "color": "Preto",
        "quantity": 2,
        "createdAt": "..."
      }
    ]
  }
}
```

### PATCH `/admin/quote-requests/:id/status`

- Purpose: Update quote status and optionally append one internal note.
- Auth requirements: JWT required.
- Params: `id`.
- Query: None.
- Request body:
  - `status` required enum: `NEW|CONTACTED|QUOTED|CONVERTED|CLOSED|REJECTED`
  - `internalNotes?: string` (optional, appended to existing array)
- Response body:
  - `{ message: "Quote request updated successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `404` quote request not found
  - `400` enum/validation errors
- Example request:

```bash
curl -X PATCH http://localhost:3000/admin/quote-requests/qr_1/status \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"status":"CONTACTED","internalNotes":"Called customer, awaiting confirmation"}'
```

- Example response:

```json
{
  "message": "Quote request updated successfully.",
  "data": {
    "id": "qr_1",
    "customerName": "Diego",
    "customerEmail": "diego@example.com",
    "customerPhone": "+1555123456",
    "customerCity": "Vancouver",
    "notes": "Need delivery estimate",
    "internalNotes": ["Called customer, awaiting confirmation"],
    "status": "CONTACTED",
    "source": "WEB_FORM",
    "createdAt": "...",
    "updatedAt": "...",
    "items": []
  }
}
```

### POST `/admin/quote-requests/:id/convert-to-sales-quote`

- Purpose: Backend-native conversion from `QuoteRequest` to `InternalSaleQuote`.
- Auth requirements: JWT + ADMIN role required.
- Params:
  - `id` (quote request id)
- Request body: none.
- Conversion behavior:
  - loads quote request with items
  - enforces one-to-one rule:
    - one quote request can generate only one internal sales quote
    - if already converted, returns `400`
  - creates internal sales quote in `DRAFT`
  - links quote to request using `publicQuoteRequestId`
  - copies customer fields:
    - `customerName`, `customerPhone`, `customerEmail`, `customerCity`, `notes`
  - copies item snapshots:
    - `productNameSnapshot`, `productSlugSnapshot`, `sizeSnapshot`, `colorSnapshot`
  - conversion item initialization:
    - `quantity` from quote request
    - `variantId` only when an exact single `(productId,size,color)` variant match exists; otherwise `null`
    - `unitSalePrice = 0`
    - `unitCostSnapshot = Product.baseCost` or `0` when missing
    - line totals are computed and quote totals are recalculated server-side
  - updates quote request state:
    - `status = CONVERTED`
    - `convertedAt = now()`
- Response body:
  - `{ message, data }`
  - `data.quoteRequest`:
    - `id`, `status`, `convertedAt`
  - `data.salesQuote`:
    - `id`, `code`, `status`, totals
  - `data.copiedItemsCount`
- Error cases:
  - `400` quote request already converted
  - `400` quote request has no items
  - `400` one or more referenced products no longer exist
  - `404` quote request not found
- Example request:

```bash
curl -X POST http://localhost:3000/admin/quote-requests/qr_1/convert-to-sales-quote \
  -H 'Authorization: Bearer <admin-token>'
```

- Example response:

```json
{
  "message": "Quote request converted to internal sales quote successfully.",
  "data": {
    "quoteRequest": {
      "id": "qr_1",
      "status": "CONVERTED",
      "convertedAt": "2026-03-09T18:10:00.000Z"
    },
    "salesQuote": {
      "id": "sq_1",
      "code": "SQ-2026-000010",
      "status": "DRAFT",
      "subtotal": "0.00",
      "discountTotal": "0.00",
      "totalRevenue": "0.00",
      "totalCost": "5300.00",
      "totalProfit": "-5300.00",
      "marginPct": null
    },
    "copiedItemsCount": 2
  }
}
```

## Domain Notes

### Categories

- Public categories endpoint only returns categories that are:
  - `isActive = true`
  - have at least one active product in DB filter, then additionally filtered in service to at least 3 active products.
- Admin category list/detail includes `_count.products`.
- Category images are URL fields on category model (`imageWebUrl`, `imageMobileUrl`), not separate image entity.

### Products

- Public product list returns only `isActive = true` products.
- Optional `category` query uses category slug, and category must also be active.
- Product detail by slug returns `404` when product inactive.
- Internal cost tracking is at product level:
  - `baseCost` (nullable decimal)
  - `costCurrency` (defaults to `MXN`)
- Internal cost fields are exposed only in admin product endpoints and are intentionally omitted from public catalog endpoints.

### Product Variants

- Variant belongs to one product.
- `sku` is optional but unique when present.
- Public endpoints include only active variants.
- Admin endpoints expose and can edit `isActive` and `stock`.
- TODO: variant-level cost fields are not implemented yet (future extension for per-size/per-color cost strategies).

### Product Images

- Product images are separate records with ordering via `order` (int, default `0`).
- Public product endpoints sort images by `order ASC`.
- Admin category detail only includes first image per product (`take: 1`).
- `secureUrl` and `publicId` are optional; useful for cloud image providers.

### Quote Requests

- Created from public endpoint with `source` forced to `WEB_FORM`.
- `status` default is `NEW`.
- Conversion workflow:
  - backend endpoint converts a quote request into one internal sales quote (`1:1` via `InternalSaleQuote.publicQuoteRequestId @unique`)
  - on conversion, quote request is marked `CONVERTED` and `convertedAt` is stored
  - when linked internal sales quote is completed, quote request is auto-updated to `CLOSED`
- `internalNotes` is an array in DB (`String[]`) and is admin-managed.
- Admin status update endpoint appends one note string at a time when provided.
- Quote requests are also included in dashboard CSV export (`/admin/dashboard/stats/export/csv`) under `quoteRequests` section.
- Admin list/detail endpoints can include linked internal sales quote summary (`internalSaleQuote`) and conversion timestamp (`convertedAt`).

### Quote Request Items

- Each item snapshots product name/slug at creation (`productNameSnapshot`, `productSlugSnapshot`).
- Item keeps reference to `productId` but UI should rely on snapshot fields for historical consistency.
- Quantity defaults to `1` when omitted.
- Item also snapshots internal cost context at request time:
  - `baseCostSnapshot`
  - `costCurrencySnapshot`
  - these are intended for admin/internal analysis, not public storefront display.

### Internal Sales Notes

- `InternalSaleQuote` supports structured internal notes via dedicated model `InternalSaleQuoteNote` (not `String[]`).
- Each note stores:
  - `message`
  - `createdAt`
  - author traceability (`authorUserId` -> `User`)
- Notes are returned in sales quote detail endpoint ordered by `createdAt ASC`.

## Frontend Integration Recommendations

Suggested service function names:

- `login(email, password)`
- `getCatalogCategories()`
- `getCatalogProducts(params?: { category?: string })`
- `getCatalogProductBySlug(slug)`
- `createQuoteRequest(payload)`
- `getAdminDashboardStats()`
- `exportAdminDashboardStatsCsv()`
- `getAdminProducts(query)`
- `exportAdminProductsCsv(query)`
- `getAdminProduct(id)`
- `createAdminProduct(payload)`
- `updateAdminProduct(id, payload)`
- `createAdminProductVariant(productId, payload)`
- `updateAdminVariant(id, payload)`
- `createAdminProductImage(productId, payload)`
- `updateAdminProductImage(id, payload)`
- `deleteAdminProductImage(id)`
- `getAdminCategories(query)`
- `exportAdminCategoriesCsv(query)`
- `getAdminCategory(id)`
- `createAdminCategory(payload)`
- `updateAdminCategory(id, payload)`
- `getAdminQuoteRequests(query)`
- `getAdminQuoteRequest(id)`
- `updateAdminQuoteRequestStatus(id, payload)`
- `convertQuoteRequestToSalesQuote(id)`
- `createInternalSaleQuote(payload)`
- `getInternalSaleQuotes(query)`
- `getInternalSaleQuote(id)`
- `updateInternalSaleQuote(id, payload)`
- `addInternalSaleQuoteItem(id, payload)`
- `updateInternalSaleQuoteItem(id, itemId, payload)`
- `deleteInternalSaleQuoteItem(id, itemId)`
- `recalculateInternalSaleQuote(id)`
- `addInternalSaleQuoteNote(id, payload)`
- `completeInternalSaleQuote(id)`
- `getAdminSales(query)`
- `getAdminSalesStats(query)`
- `exportAdminSalesCsv(query)`
- `getAdminSale(id)`

Important fields for UI rendering:

- Catalog list/detail:
  - Product: `id`, `name`, `slug`, `description`, `images`, `variants`, `category`
  - Variant: `size`, `color`, `stock`, `isActive`
  - Category: `name`, `slug`, `imageWebUrl`, `imageMobileUrl`
- Quote flows:
  - Quote: `status`, `customerName`, `customerPhone`, `items`, `createdAt`
  - Quote item snapshot fields for immutable historical labels.
- Admin tables:
  - Use `meta.total`, `meta.page`, `meta.limit`, `meta.totalPages` when present.
- Completed sales:
  - Header: `saleNumber`, `status`, `customerName`, `currency`, `totalRevenue`, `totalProfit`, `completedAt`
  - Items: snapshot fields (`productNameSnapshot`, `sizeSnapshot`, `colorSnapshot`, `skuSnapshot`) plus line totals.

Known pitfalls:

- Most admin JSON endpoints are JWT-protected but not role-guarded; CSV export and internal sales quote endpoints enforce ADMIN role explicitly.
- `POST /admin/quote-requests/:id/convert-to-sales-quote` is ADMIN-only and stateful (creates linked internal sales quote).
- CSV export endpoints require `ADMIN` role and return plain text CSV, not JSON.
- Completed sales stats currently expose JSON only; no dedicated `/admin/sales/stats/export/csv` endpoint yet.
- DTO whitelist + forbid non-whitelisted means frontend must avoid extra properties in payloads.
- Boolean query parsing depends on transform; send explicit `true`/`false` strings.
- Public categories have hidden business rule (minimum 3 active products), which can make categories disappear unexpectedly.
- /users is publicly accessible and returns a user list; this is likely not desirable for production (**inferred**).

Inferred best practices:

- Centralize HTTP client with auth interceptor and typed error normalization.
- Model API responses with exact endpoint-specific types (`{ data, meta }` vs raw arrays/objects).
- Use optimistic UI cautiously on admin mutation endpoints; uniqueness checks (slug/SKU) can reject late.
- Treat enum values as strict unions:
  - `QuoteRequestStatus`: `NEW | CONTACTED | QUOTED | CONVERTED | CLOSED | REJECTED`
  - `QuoteRequestSource`: `WEB_FORM | WHATSAPP`
  - `UserRole`: `ADMIN | USER`
- Prefer rendering quote item snapshot fields over live product fetch in admin quote history screens.

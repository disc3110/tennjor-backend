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
- Utility endpoints (`/`, `/users`)

Data store is PostgreSQL via Prisma.

- Base URL: `http://localhost:3000` by default in local dev (from `main.ts` listening on `process.env.PORT ?? 3000`).
- No global prefix (routes are mounted exactly as defined in controllers).
- Content type: `application/json`.
- Authenticated endpoints require:
  - `Authorization: Bearer <accessToken>`

CORS:

- CORS is enabled with `origin: true` and `credentials: true`.

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

| Method | Path                                  | Auth required | Admin only    | Description                                   |
| ------ | ------------------------------------- | ------------- | ------------- | --------------------------------------------- |
| GET    | `/`                                   | No            | No            | Health-like hello string                      |
| GET    | `/users`                              | No            | No            | List users (safe fields)                      |
| POST   | `/auth/login`                         | No            | No            | Authenticate and get JWT                      |
| GET    | `/catalog/categories`                 | No            | No            | Public active categories (filtered)           |
| GET    | `/catalog/products`                   | No            | No            | Public active products list                   |
| GET    | `/catalog/products/:slug`             | No            | No            | Public product detail by slug                 |
| POST   | `/quote-requests`                     | No            | No            | Create quote request                          |
| GET    | `/admin/dashboard/stats`              | Yes           | No (JWT only) | Dashboard KPIs                                |
| GET    | `/admin/dashboard/stats/export/csv`   | Yes           | Yes           | Download dashboard stats + quote requests CSV |
| GET    | `/admin/products`                     | Yes           | No (JWT only) | Admin product list                            |
| GET    | `/admin/products/export/csv`          | Yes           | Yes           | Download products CSV                         |
| GET    | `/admin/products/:id`                 | Yes           | No (JWT only) | Admin product detail                          |
| POST   | `/admin/products`                     | Yes           | No (JWT only) | Create product                                |
| PATCH  | `/admin/products/:id`                 | Yes           | No (JWT only) | Update product                                |
| POST   | `/admin/products/:productId/variants` | Yes           | No (JWT only) | Create product variant                        |
| PATCH  | `/admin/variants/:id`                 | Yes           | No (JWT only) | Update product variant                        |
| POST   | `/admin/products/:productId/images`   | Yes           | No (JWT only) | Create product image                          |
| PATCH  | `/admin/product-images/:id`           | Yes           | No (JWT only) | Update product image                          |
| DELETE | `/admin/product-images/:id`           | Yes           | No (JWT only) | Delete product image                          |
| GET    | `/admin/categories`                   | Yes           | No (JWT only) | Admin category list                           |
| GET    | `/admin/categories/export/csv`        | Yes           | Yes           | Download categories CSV                       |
| GET    | `/admin/categories/:id`               | Yes           | No (JWT only) | Admin category detail                         |
| POST   | `/admin/categories`                   | Yes           | No (JWT only) | Create category                               |
| PATCH  | `/admin/categories/:id`               | Yes           | No (JWT only) | Update category                               |
| GET    | `/admin/quote-requests`               | Yes           | No (JWT only) | Admin quote requests list                     |
| GET    | `/admin/quote-requests/:id`           | Yes           | No (JWT only) | Admin quote request detail                    |
| PATCH  | `/admin/quote-requests/:id/status`    | Yes           | No (JWT only) | Update quote request status                   |

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
  - `name`, `slug`, `description`, `isActive`, `categoryId`
- Response body:
  - `{ message: "Product updated successfully.", data: ... }`
- Error cases:
  - `401` auth
  - `404` product not found
  - `400` category not found
  - `400` slug already exists
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
    "createdAt": "...",
    "updatedAt": "...",
    "category": { "id": "cat_1", "name": "Tênis", "slug": "tenis" },
    "images": [],
    "variants": []
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

### GET `/admin/quote-requests`

- Purpose: Admin quote request list with pagination/filter/search.
- Auth requirements: JWT required.
- Params: None.
- Query:
  - `status?: NEW|CONTACTED|QUOTED|CLOSED|REJECTED`
  - `search?: string` (name/email/phone contains, insensitive)
  - `page?: number >=1` (default `1`)
  - `limit?: number >=1` (default `10`)
- Request body: None.
- Response body:
  - `{ data: QuoteRequestAdmin[], meta: { total, page, limit, totalPages } }`
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
      "source": "WEB_FORM",
      "createdAt": "...",
      "updatedAt": "...",
      "items": [
        {
          "id": "qri_1",
          "productId": "prod_1",
          "productNameSnapshot": "Tênis Alpha",
          "productSlugSnapshot": "tenis-alpha",
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
    "source": "WEB_FORM",
    "createdAt": "...",
    "updatedAt": "...",
    "items": [
      {
        "id": "qri_1",
        "productId": "prod_1",
        "productNameSnapshot": "Tênis Alpha",
        "productSlugSnapshot": "tenis-alpha",
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
  - `status` required enum: `NEW|CONTACTED|QUOTED|CLOSED|REJECTED`
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

### Product Variants

- Variant belongs to one product.
- `sku` is optional but unique when present.
- Public endpoints include only active variants.
- Admin endpoints expose and can edit `isActive` and `stock`.

### Product Images

- Product images are separate records with ordering via `order` (int, default `0`).
- Public product endpoints sort images by `order ASC`.
- Admin category detail only includes first image per product (`take: 1`).
- `secureUrl` and `publicId` are optional; useful for cloud image providers.

### Quote Requests

- Created from public endpoint with `source` forced to `WEB_FORM`.
- `status` default is `NEW`.
- `internalNotes` is an array in DB (`String[]`) and is admin-managed.
- Admin status update endpoint appends one note string at a time when provided.
- Quote requests are also included in dashboard CSV export (`/admin/dashboard/stats/export/csv`) under `quoteRequests` section.

### Quote Request Items

- Each item snapshots product name/slug at creation (`productNameSnapshot`, `productSlugSnapshot`).
- Item keeps reference to `productId` but UI should rely on snapshot fields for historical consistency.
- Quantity defaults to `1` when omitted.

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

Known pitfalls:

- Most admin JSON endpoints are JWT-protected but not role-guarded; only CSV export endpoints currently enforce the ADMIN role explicitly.
- CSV export endpoints require `ADMIN` role and return plain text CSV, not JSON.
- DTO whitelist + forbid non-whitelisted means frontend must avoid extra properties in payloads.
- Boolean query parsing depends on transform; send explicit `true`/`false` strings.
- Public categories have hidden business rule (minimum 3 active products), which can make categories disappear unexpectedly.
- /users is publicly accessible and returns a user list; this is likely not desirable for production (**inferred**).

Inferred best practices:

- Centralize HTTP client with auth interceptor and typed error normalization.
- Model API responses with exact endpoint-specific types (`{ data, meta }` vs raw arrays/objects).
- Use optimistic UI cautiously on admin mutation endpoints; uniqueness checks (slug/SKU) can reject late.
- Treat enum values as strict unions:
  - `QuoteRequestStatus`: `NEW | CONTACTED | QUOTED | CLOSED | REJECTED`
  - `QuoteRequestSource`: `WEB_FORM | WHATSAPP`
  - `UserRole`: `ADMIN | USER`
- Prefer rendering quote item snapshot fields over live product fetch in admin quote history screens.
